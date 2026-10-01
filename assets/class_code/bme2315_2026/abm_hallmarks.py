"""
Single Cancer Cell in Epithelium - Grid-Based ABM
===================================================

A single cell starts with a mutation (sustained growth signals).
Watch it compete with normal cells on a grid.

Key concept: Cells on a grid push against each other.
Normal cells divide slowly and respect crowding.
Mutant cell with sustained growth signals divides faster and pushes out normal cells.

Adjust the parameters below to explore.
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.animation import FuncAnimation
from matplotlib.colors import ListedColormap


# ============================================================================
# PARAMETERS - ADJUST THESE
# ============================================================================

# Grid size (number of cells per side)
GRID_SIZE = 20

# Division parameters for NORMAL cells
NORMAL_DIVIDE_THRESHOLD = 100  # Generations before normal cell stops dividing
NORMAL_DIVIDE_PROBABILITY = 0.01  # Chance to divide per step

# Division parameters for CANCER cell (with sustained growth signals ON)
CANCER_DIVIDE_THRESHOLD = 500  # Can divide many more times
CANCER_DIVIDE_PROBABILITY = 0.05  # Divides more frequently

# ============================================================================
# TOGGLE THIS TO TURN ON/OFF SUSTAINED GROWTH SIGNALS
# ============================================================================
CANCER_SUSTAINED_GROWTH_ENABLED = True
# ============================================================================


# ============================================================================
# CELL CLASS
# ============================================================================

class EpithelialCell:
    """A cell on the grid."""
    
    def __init__(self, x, y, is_cancer=False):
        """
        Args:
            x, y: position on grid
            is_cancer: True if this is the mutant cell (or its descendants)
        """
        self.x = x
        self.y = y
        self.is_cancer = is_cancer
        self.divisions = 0  # How many times this cell has divided
        self.age = 0  # How old this cell is
        
        # Set division rules based on cell type
        if is_cancer and CANCER_SUSTAINED_GROWTH_ENABLED:
            self.max_divisions = CANCER_DIVIDE_THRESHOLD
            self.divide_prob = CANCER_DIVIDE_PROBABILITY
        else:
            self.max_divisions = NORMAL_DIVIDE_THRESHOLD
            self.divide_prob = NORMAL_DIVIDE_PROBABILITY
    
    def get_color(self):
        """Return color: blue=normal, red=cancer."""
        return 'red' if self.is_cancer else 'blue'
    
    def can_divide(self):
        """Check if cell should divide."""
        # Can't divide if hit max divisions
        if self.divisions >= self.max_divisions:
            return False
        
        # Random chance to divide
        if np.random.random() < self.divide_prob:
            return True
        
        return False


# ============================================================================
# GRID-BASED EPITHELIUM
# ============================================================================

class Epithelium:
    """A grid of epithelial cells."""
    
    def __init__(self, size=20):
        """Initialize a grid of normal cells."""
        self.size = size
        self.grid = {}  # (x, y) -> Cell
        
        # Fill grid with normal cells
        for x in range(size):
            for y in range(size):
                self.grid[(x, y)] = EpithelialCell(x, y, is_cancer=False)
        
        # Place the cancer cell in the center
        center = size // 2
        self.cancer_cell = EpithelialCell(center, center, is_cancer=True)
        self.grid[(center, center)] = self.cancer_cell
    
    def get_empty_neighbors(self, x, y):
        """
        Find neighboring cells that could be pushed out.
        On a grid, neighbors are adjacent cells (up, down, left, right, and diagonals).
        """
        neighbors = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.size and 0 <= ny < self.size:
                    neighbors.append((nx, ny))
        return neighbors
    
    def step(self):
        """Simulate one time step."""
        cells_to_divide = []
        
        # Check which cells want to divide
        for (x, y), cell in list(self.grid.items()):
            if cell.can_divide():
                cells_to_divide.append((x, y, cell))
            cell.age += 1
        
        # Process divisions
        for x, y, parent_cell in cells_to_divide:
            neighbors = self.get_empty_neighbors(x, y)
            if not neighbors:
                continue  # No space to divide
            
            # Pick a random neighbor and replace it
            nx, ny = neighbors[np.random.randint(len(neighbors))]
            
            # Create daughter cell
            daughter = EpithelialCell(nx, ny, is_cancer=parent_cell.is_cancer)
            daughter.divisions = parent_cell.divisions + 1
            
            # Place daughter cell
            self.grid[(nx, ny)] = daughter
            parent_cell.divisions += 1
    
    def get_stats(self):
        """Get statistics about the epithelium."""
        normal_cells = sum(1 for cell in self.grid.values() if not cell.is_cancer)
        cancer_cells = sum(1 for cell in self.grid.values() if cell.is_cancer)
        
        cancer_divisions = self.cancer_cell.divisions if self.cancer_cell in self.grid.values() else 0
        cancer_age = self.cancer_cell.age if self.cancer_cell in self.grid.values() else 0
        
        return {
            'normal': normal_cells,
            'cancer': cancer_cells,
            'cancer_divisions': cancer_divisions,
            'cancer_age': cancer_age
        }


# ============================================================================
# VISUALIZATION
# ============================================================================

def visualize_epithelium(epithelium, title="Epithelium"):
    """Create a visualization of the epithelium grid."""
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Create color grid
    color_grid = np.zeros((epithelium.size, epithelium.size))
    for (x, y), cell in epithelium.grid.items():
        color_grid[y, x] = 1 if cell.is_cancer else 0
    
    # Display
    cmap = ListedColormap(['#3b82f6', '#f56565'])  # Blue for normal, red for cancer
    im = ax.imshow(color_grid, cmap=cmap, origin='lower', extent=[0, epithelium.size, 0, epithelium.size])
    
    # Draw grid lines
    for i in range(epithelium.size + 1):
        ax.axhline(i, color='gray', linewidth=0.5, alpha=0.3)
        ax.axvline(i, color='gray', linewidth=0.5, alpha=0.3)
    
    ax.set_xlim(0, epithelium.size)
    ax.set_ylim(0, epithelium.size)
    ax.set_aspect('equal')
    ax.set_xlabel('X position')
    ax.set_ylabel('Y position')
    
    stats = epithelium.get_stats()
    ax.set_title(f'{title}\nNormal: {stats["normal"]} | Cancer: {stats["cancer"]} | Divisions: {stats["cancer_divisions"]}')
    
    return fig, ax


# ============================================================================
# SIMULATION
# ============================================================================

class Simulation:
    def __init__(self, grid_size=20):
        self.epithelium = Epithelium(grid_size)
        self.time = 0
        self.history = {
            'time': [],
            'normal': [],
            'cancer': [],
            'cancer_divisions': []
        }
        self.record_stats()
    
    def step(self):
        """Run one simulation step."""
        self.epithelium.step()
        self.time += 1
        self.record_stats()
    
    def record_stats(self):
        """Record current statistics."""
        stats = self.epithelium.get_stats()
        self.history['time'].append(self.time)
        self.history['normal'].append(stats['normal'])
        self.history['cancer'].append(stats['cancer'])
        self.history['cancer_divisions'].append(stats['cancer_divisions'])
    
    def run(self, steps=500):
        """Run simulation for N steps."""
        for _ in range(steps):
            self.step()
            if self.time % 100 == 0:
                print(f"Step {self.time}: Normal={self.history['normal'][-1]}, Cancer={self.history['cancer'][-1]}")
    
    def plot_results(self):
        """Plot simulation results."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Final epithelium state
        ax = axes[0, 0]
        color_grid = np.zeros((self.epithelium.size, self.epithelium.size))
        for (x, y), cell in self.epithelium.grid.items():
            color_grid[y, x] = 1 if cell.is_cancer else 0
        cmap = ListedColormap(['#3b82f6', '#f56565'])
        ax.imshow(color_grid, cmap=cmap, origin='lower')
        for i in range(self.epithelium.size + 1):
            ax.axhline(i, color='gray', linewidth=0.5, alpha=0.3)
            ax.axvline(i, color='gray', linewidth=0.5, alpha=0.3)
        ax.set_title('Final Epithelium State')
        ax.set_aspect('equal')
        
        # Cell counts over time
        ax = axes[0, 1]
        ax.plot(self.history['time'], self.history['normal'], label='Normal cells', linewidth=2, color='#3b82f6')
        ax.plot(self.history['time'], self.history['cancer'], label='Cancer cells', linewidth=2, color='#f56565')
        ax.set_xlabel('Time (steps)')
        ax.set_ylabel('Cell count')
        ax.set_title('Population Dynamics')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Cancer cell divisions
        ax = axes[1, 0]
        ax.plot(self.history['time'], self.history['cancer_divisions'], linewidth=2, color='#f56565')
        ax.set_xlabel('Time (steps)')
        ax.set_ylabel('Divisions')
        ax.set_title('Cancer Cell Division Count')
        ax.grid(True, alpha=0.3)
        
        # Statistics text
        ax = axes[1, 1]
        ax.axis('off')
        final_stats = self.epithelium.get_stats()
        text = f"""
SIMULATION RESULTS
{'='*40}

Settings:
  Sustained growth enabled: {CANCER_SUSTAINED_GROWTH_ENABLED}
  Grid size: {self.epithelium.size}×{self.epithelium.size}
  Normal divide threshold: {NORMAL_DIVIDE_THRESHOLD}
  Cancer divide threshold: {CANCER_DIVIDE_THRESHOLD}

Final State (step {self.time}):
  Normal cells: {final_stats['normal']}
  Cancer cells: {final_stats['cancer']}
  Cancer divisions: {final_stats['cancer_divisions']}
  
Key Insight:
  {self._get_insight()}
        """
        ax.text(0.1, 0.5, text, fontsize=11, family='monospace',
                verticalalignment='center',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        
        plt.suptitle('Cancer Cell Emergence in Epithelium', fontsize=14, fontweight='bold')
        plt.tight_layout()
        return fig
    
    def _get_insight(self):
        """Return a message based on simulation outcome."""
        cancer_fraction = self.history['cancer'][-1] / (self.history['cancer'][-1] + self.history['normal'][-1])
        
        if cancer_fraction < 0.1:
            return "Cancer cell mostly contained. Single\nmutation not enough."
        elif cancer_fraction < 0.5:
            return "Hyperplasia formed. Cancer cell\noutcompetes some normal cells."
        else:
            return "Carcinoma. Cancer cells take over."


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("="*60)
    print("EPITHELIAL CANCER SIMULATION")
    print("="*60)
    print()
    print("CURRENT SETTINGS:")
    print(f"  Grid size: {GRID_SIZE}×{GRID_SIZE}")
    print(f"  Normal cell divide probability: {NORMAL_DIVIDE_PROBABILITY}")
    print(f"  Normal cell max divisions: {NORMAL_DIVIDE_THRESHOLD}")
    print()
    
    if CANCER_SUSTAINED_GROWTH_ENABLED:
        print("  ✓ SUSTAINED GROWTH SIGNALS ENABLED FOR CANCER CELL")
        print(f"    Cancer divide probability: {CANCER_DIVIDE_PROBABILITY}")
        print(f"    Cancer max divisions: {CANCER_DIVIDE_THRESHOLD}")
    else:
        print("  ✗ Sustained growth signals DISABLED")
        print("    Cancer cell uses normal rules")
    
    print()
    print("Starting simulation...")
    print()
    
    # Create and run simulation
    sim = Simulation(grid_size=GRID_SIZE)
    sim.run(steps=500)
    
    # Display final state
    print()
    print("="*60)
    stats = sim.epithelium.get_stats()
    print(f"Final: {stats['normal']} normal cells, {stats['cancer']} cancer cells")
    print(f"Cancer cell performed {stats['cancer_divisions']} divisions")
    print("="*60)
    
    # Plot
    fig = sim.plot_results()
    plt.show()