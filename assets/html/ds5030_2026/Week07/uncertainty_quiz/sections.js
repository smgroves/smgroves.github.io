// Course sections for the live quiz. Each section votes, sees results, and gets answers revealed separately.
// `name` is what students see. `id` goes in links (?section=s1) and in the database, so it must be
// short lowercase letters/digits and must match the list in the Realtime Database rules.
// You can rename a section any time; changing or adding an `id` also means updating the rules.
window.QUIZ_SECTIONS = [
  { id: "s1", name: "T/Th 9:30 Johnson" },
  { id: "s2", name: "T/Th 11 Johnson" },
  { id: "s3", name: "T/Th 11 Groves" },
];
