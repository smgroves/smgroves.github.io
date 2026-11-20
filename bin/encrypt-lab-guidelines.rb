#!/usr/bin/env ruby
# Encrypts the Lab Guidelines pages for /research/lab-guidelines/.
#
# Source: lab-guidelines-src/*.md (gitignored; never committed). Each file starts
# with a line like  <!-- id: expectations | title: Lab expectations -->
# and files are shown in filename order. Links between pages use #<id>.
#
# Output: assets/json/lab-guidelines.enc.json (committed). The browser decrypts it
# with the password (PBKDF2-SHA256 -> AES-256-GCM via Web Crypto).
#
# Run from the repo root:
#   PATH=/opt/homebrew/opt/ruby/bin:$PATH bundle exec ruby bin/encrypt-lab-guidelines.rb
# It asks for the password (or reads LAB_GUIDELINES_PASSWORD). Re-run after any
# edit to the source files, or to change the password.

require "kramdown"
require "kramdown-parser-gfm"
require "openssl"
require "json"
require "base64"
require "io/console"

ROOT = File.expand_path("..", __dir__)
SRC = File.join(ROOT, "lab-guidelines-src")
OUT = File.join(ROOT, "assets/json/lab-guidelines.enc.json")
ITERATIONS = 310_000

files = Dir[File.join(SRC, "*.md")].sort
abort "No source files in #{SRC}" if files.empty?

pages = files.map do |f|
  text = File.read(f, encoding: "UTF-8")
  m = text.match(/\A<!--\s*id:\s*([\w-]+)\s*\|\s*title:\s*(.+?)\s*-->\s*\n/)
  abort "#{File.basename(f)}: first line must be <!-- id: ... | title: ... -->" unless m
  body = text[m[0].length..]
  html = Kramdown::Document.new(body, input: "GFM", hard_wrap: false, auto_ids: true).to_html
  { id: m[1], title: m[2], html: html }
end

password = ENV["LAB_GUIDELINES_PASSWORD"]
if password.nil? || password.empty?
  password = IO.console.getpass("Password: ")
  confirm = IO.console.getpass("Again: ")
  abort "Passwords don't match" unless password == confirm
end
abort "Empty password" if password.empty?

salt = OpenSSL::Random.random_bytes(16)
iv = OpenSSL::Random.random_bytes(12)
key = OpenSSL::KDF.pbkdf2_hmac(password, salt: salt, iterations: ITERATIONS, length: 32, hash: "sha256")
cipher = OpenSSL::Cipher.new("aes-256-gcm").encrypt
cipher.key = key
cipher.iv = iv
data = cipher.update(JSON.generate({ pages: pages })) + cipher.final
data += cipher.auth_tag # Web Crypto expects the tag appended

File.write(OUT, JSON.pretty_generate({
  v: 1,
  kdf: "PBKDF2-SHA256",
  iterations: ITERATIONS,
  salt: Base64.strict_encode64(salt),
  iv: Base64.strict_encode64(iv),
  data: Base64.strict_encode64(data),
}) + "\n")
puts "Encrypted #{pages.size} pages (#{pages.map { |p| p[:id] }.join(', ')}) -> #{OUT.sub(ROOT + '/', '')}"
