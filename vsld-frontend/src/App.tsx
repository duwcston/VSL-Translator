import { Header } from "./components/UI/Header";
import Tabs from "./components/UI/Tabs";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-repeat-y">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply opacity-70 animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        <div className="container mx-auto px-6 py-8">
          <Header />
          <div className="my-8">
            <Tabs />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

// Margin: External Spacing
// Padding: Internal Spacing
