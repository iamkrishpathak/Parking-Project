import { InteractiveHoverButton } from "./interactive-hover-button";

function InteractiveHoverButtonDemo() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Interactive Hover Button</h1>
          <p className="text-slate-300">Hover over the buttons to see the animation</p>
        </div>
        
        <div className="flex flex-wrap gap-6 justify-center">
          <InteractiveHoverButton text="Get Started" />
          <InteractiveHoverButton text="Learn More" />
          <InteractiveHoverButton text="Book Now" />
          <InteractiveHoverButton text="Find Parking" />
        </div>
      </div>
    </div>
  );
}

export { InteractiveHoverButtonDemo };
