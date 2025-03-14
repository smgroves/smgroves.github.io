### A Pluto.jl notebook ###
# v0.19.27

using Markdown
using InteractiveUtils

# This Pluto notebook uses @bind for interactivity. When running this notebook outside of Pluto, the following 'mock version' of @bind gives bound variables a default value (instead of an error).
macro bind(def, element)
    quote
        local iv = try Base.loaded_modules[Base.PkgId(Base.UUID("6e696c72-6542-2067-7265-42206c756150"), "AbstractPlutoDingetjes")].Bonds.initial_value catch; b -> missing; end
        local el = $(esc(element))
        global $(esc(def)) = Core.applicable(Base.get, el) ? Base.get(el) : iv(el)
        el
    end
end

# ╔═╡ 1e0d077b-93d1-4eb9-a18b-c5634441783f
# ╠═╡ show_logs = false
begin
	import Pkg; Pkg.add("Plots")
	Pkg.add("PlutoUI")
	Pkg.add("LaTeXStrings")
	using Plots
	using PlutoUI
	using LaTeXStrings

end

# ╔═╡ 51c42871-4bb7-483d-b6d9-b88529dd3564
md"# Constraining the Parameters in the Cahn Hilliard Equation"

# ╔═╡ 8ae3c9c8-07a7-493e-9b02-d04cc71fe249
md"The Cahn Hilliard equation is used to model condensate formation, or liquid-liquid phase separation. In other words, when a liquid droplet forms within another liquid, the dynamics of those two phases (two liquids) can be modeled with this equation. However, it's a fourth order, nonlinear differential equation, so it is very hard to solve. We have implemented a multigrid solver for it in Julia here."

# ╔═╡ 14f4088b-457c-492c-b391-22015a8b9103
md"
The Cahn Hilliard equation is really made up of two equations:
```math

\frac{\delta\phi(x,y,t)}{\delta t} = M \Delta\mu(x,y,t),
```
```math

\mu(x,y,t) = F'(\phi(x,y,t))-\epsilon^2\Delta\phi(x,y,t) 

```
"

# ╔═╡ c8d0619b-65c6-4e75-aee5-b61fb62d2a77
md"
The first equation says that the change in $\phi$ (concentration rescaled to -1 to +1, where -1 is the dilute phase and +1 is the condensed phase) is dependent on a mobility term M (related to diffusion) and the Laplacian (~second derivative, $\Delta$) of the chemical potential, $\mu$. The second equation says the chemical potential $\mu$ is dependent on the derivative of the free energy ($F'$) and a term related to the interfacial energy (the cost associated with an interface forming between two phases, $\epsilon$) and the Laplacian of phi ($\Delta \phi$)."

# ╔═╡ 8a3374a5-4b3a-4874-918f-97be5544fa77
md"## The Free Energy Functional"

# ╔═╡ efaa8672-661c-417e-9984-4701248b861a
md"F is the free energy functional, and the key to modeling phase separation. When you have molecules that weakly interact with themselves (attractive force between like molecules) or repel each other (repellant force between unalike molecules), you can get a free energy that looks like a double well potential when plotted against concentration. This means that two phases (each with a molecular concentration equal to the bottom of each well) will have a lower energy than a single mixed phase at an intermediate concentration. By changing F, we can model different scenarios."

# ╔═╡ 8fabe1dc-1f28-4739-9fc5-aa0af8f8bcb2
md"
![Free energy functional, Chemical potential, and Temperture versus volume fraction.](https://www.annualreviews.org/docserver/fulltext/cellbio/30/1/cb300039.f4.gif)
"

# ╔═╡ 0b1450d5-0409-4fca-a753-9ea5ab1006e8
md"*Light blue is a system without interactions between molecules (i.e., no weaking binding between like molecules). Dark blue is a system with weak interactions that will phase separate to a phase with concentrations $\phi_{S}$ and $\phi_{D}$ in the soluble/dilute and droplet phases, respectively.*"

# ╔═╡ fbc006da-ea95-46b8-84de-9022be4d280f
md"### Changing alpha to change the spinodal point.
Alpha is a parameter that affects the 'spinodal point' of the system. This determines whether the system preferentially goes to the -1 or +1 phase. In the graphic below, the third dotted line (right side of the unstable region) represents the spinodal point.
"

# ╔═╡ 116063dc-0909-422f-bf11-03a647463755
md"![](https://www.researchgate.net/publication/7796265/figure/fig11/AS:667129992978438@1536067593648/The-homogeneous-part-of-the-free-energy-density-F-as-a-function-of-the-reduced-density-m.png)"

# ╔═╡ 119827b1-6415-44cb-8d16-4ee1cfe1f5d1
@bind alpha Slider(-1:0.05:1, default=0) 

# ╔═╡ a80a1194-95cd-49f1-8590-390cd5e31737
alpha

# ╔═╡ 6f57ebee-088d-4462-a850-e9853a3f2e41
function F_function(x, alpha)
	return 	(1/4)*(x^4)-(.5*x^2)-(alpha/3)*(x^3)+(alpha*x)
end

# ╔═╡ 551e38f7-c112-4faf-af18-85213e501c3a
md"
Note that F can be shifted to be positive, but this will not change the derivatives and thus the spinodal point."

# ╔═╡ c6849a96-3d69-11ef-0933-0fd49936b533
# ╠═╡ skip_as_script = true
#=╠═╡
begin
	x = range(-1.5, 1.5, length=100)
	F = (1/4).*(x.^4).-(.5*x.^2)-(alpha/3).*(x.^3).+(alpha.*x)
	dF = (x.+1).*(x.-1).*(x.-alpha)
	ddF =3*(x.^2).-(2*alpha*x).-1; nothing
end
  ╠═╡ =#

# ╔═╡ bde71c2a-60b2-48ba-aa2a-251971429bd9
function quadratic(a,b,c)
	discr = b^2 - 4*a*c
	roots = ( (-b + sqrt(discr))/(2a), (-b - sqrt(discr))/(2a) )
	return maximum(roots)
end

# ╔═╡ bcf114fc-fe6a-49b5-8ca0-be6ef9c06635
#=╠═╡
begin
	using Plots.PlotMeasures

	plot(x,[F,dF,ddF], title = "Free Energy Functional and Derivatives \n for alpha = $(alpha)", top_margin = 20px, label = ["F" L"$\frac{dF}{d\phi}$" L"$\frac{d^2F}{d\phi^2}$"],lw=[3 1 1],ls = [:solid :dash :dash],legend = :outertopright, size = (700,400))
	ylabel!("Free Energy Functional")
	xlabel!(L"$\phi$")
	ylims!(minimum(F), maximum(F))
	plot!(x, repeat([0], length(x)), color = "grey", label = "", lw = 2, ls = :dash)
	plot!([quadratic(3, -2*alpha, -1)], [0],seriestype=:scatter, label = L"$\phi_{spinodal}$", color = "blue")
	plot!([quadratic(3, -2*alpha, -1),quadratic(3, -2*alpha, -1)], [0,F_function(quadratic(3, -2*alpha, -1), alpha)], arrow = true,label="", color = "black", lw = 3)
	annotate!(quadratic(3, -2*alpha, -1)+.05,.2*(maximum(F)),text("spinodal = \n $(round(quadratic(3, -2*alpha, -1), sigdigits=3))", :red, :left, 8) ,)
	
end
  ╠═╡ =#

# ╔═╡ fdab8ce2-9230-43a4-9625-507f734fe39a
md"
So a more negative $\alpha$ leads to a lower spinodal point, which means that the +1 phase will form at a lower concentration or $\phi$. For example, at $\alpha$ = -0.5, $\phi$ above 0.434 will lead to formation of the +1 phase. In contrast, $\alpha$ = 0.5 needs a $\phi$ of at least 0.768 for a condensate to form."

# ╔═╡ bd3878da-03fd-410e-b433-fc7329e331b4
md"### Fitting the spinodal point to our biological system.

We are modeling the [phase separation](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7341897/) of a protein complex, CPC, that forms during mitosis to coordinate several components of chromosome segregation, including the spindle assembly checkpoint. It is known that the concentration of CPC inside the condensate is about 8.4uM. Trivedi et al. also found that the concentration of CPC needed to phase separate at a physiological ionic concentration is about 6uM. Thus the spinodal point, or the point at which phase separation occurs, is 6/8.4 = 0.71 (within the range 0 to 1). Converting this to $\phi \in [-1,1]$ gives $\phi_{spinodal} =0.71*2-1= 0.42$. This equates to an $\alpha \approx -0.5$."

# ╔═╡ Cell order:
# ╟─51c42871-4bb7-483d-b6d9-b88529dd3564
# ╟─8ae3c9c8-07a7-493e-9b02-d04cc71fe249
# ╟─14f4088b-457c-492c-b391-22015a8b9103
# ╟─c8d0619b-65c6-4e75-aee5-b61fb62d2a77
# ╟─8a3374a5-4b3a-4874-918f-97be5544fa77
# ╟─efaa8672-661c-417e-9984-4701248b861a
# ╟─8fabe1dc-1f28-4739-9fc5-aa0af8f8bcb2
# ╟─0b1450d5-0409-4fca-a753-9ea5ab1006e8
# ╟─1e0d077b-93d1-4eb9-a18b-c5634441783f
# ╟─fbc006da-ea95-46b8-84de-9022be4d280f
# ╟─116063dc-0909-422f-bf11-03a647463755
# ╠═119827b1-6415-44cb-8d16-4ee1cfe1f5d1
# ╟─a80a1194-95cd-49f1-8590-390cd5e31737
# ╠═6f57ebee-088d-4462-a850-e9853a3f2e41
# ╟─551e38f7-c112-4faf-af18-85213e501c3a
# ╟─c6849a96-3d69-11ef-0933-0fd49936b533
# ╟─bde71c2a-60b2-48ba-aa2a-251971429bd9
# ╟─bcf114fc-fe6a-49b5-8ca0-be6ef9c06635
# ╟─fdab8ce2-9230-43a4-9625-507f734fe39a
# ╟─bd3878da-03fd-410e-b433-fc7329e331b4
