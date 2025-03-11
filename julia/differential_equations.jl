### A Pluto.jl notebook ###
# Run this in a Pluto.jl session

using PlutoUI, Plots, DifferentialEquations
using PlutoSliderServer


# Define the interactive notebook
md"# Interactive Differential Equations Notebook"

## Exercise 1: Predefined Differential Equation

md"### Exercise 1: Visualizing a Given DE"

md"**Equation:** \\[ \\frac{dy}{dx} = x - y \\]"

# Define the equation
function predefined_de(u, p, x)
    return x - u
end

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

## Exercise 2: User-defined Differential Equation

md"### Exercise 2: Enter Your Own DE"

md"Enter a first-order differential equation in terms of `x` and `y`:"

@bind user_de TextField(placeholder="e.g., x - y + sin(x)")

try
    # Parse the user's input into a function
    parsed_de = eval(Meta.parse("function user_defined_de(u, p, x) return $(user_de) end"))
    
    # Generate the slope field
    slopes_user = parsed_de.(y_grid, nothing, x_grid)
    slopes_user_norm = slopes_user ./ sqrt.(1 .+ slopes_user.^2)

    # Plot user-defined slope field
    p2 = plot(; xlabel="x", ylabel="y", title="Slope Field for User-defined DE")
    quiver!(x_grid, y_grid, quiver=(ones(size(slopes_user_norm)), slopes_user_norm))
    
    p2
catch e
    md"**Error:** Invalid equation. Please check your input."
end
