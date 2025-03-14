### A Pluto.jl notebook ###
# v0.19.47

using Markdown
using InteractiveUtils

# ╔═╡ 6dcc2b18-644b-42ab-9f5e-d0949295d45d
using Plots, DifferentialEquations
using PlutoSliderServer


# ╔═╡ e43a463e-61ea-4c61-9076-5bf426880074
# Generate a slope field
x_vals = -2:0.2:2
y_vals = -2:0.2:2
x_grid = repeat(x_vals, 1, length(y_vals))
y_grid = repeat(y_vals', length(x_vals), 1)
slopes = predefined_de.(y_grid, nothing, x_grid)

# Normalize slopes for visualization
slopes_norm = slopes ./ sqrt.(1 .+ slopes.^2)

# Plot slope field
p1 = plot(; xlabel="x", ylabel="y", title="Slope Field for dy/dx = x - y")
quiver!(x_grid, y_grid, quiver=(ones(size(slopes_norm)), slopes_norm))

# Add adjustable solution curve
@bind C Slider(-2:0.1:2, show_value=true)
solution_x = -2:0.1:2
solution_y = exp.(-solution_x) .+ solution_x .- 1 .+ C
plot!(solution_x, solution_y, label="Solution Curve", linewidth=3, color=:black)

p1
# ╔═╡ Cell order:
# ╠═6dcc2b18-644b-42ab-9f5e-d0949295d45d
# ╠═e43a463e-61ea-4c61-9076-5bf426880074
