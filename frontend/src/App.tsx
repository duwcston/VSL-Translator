import { Header } from "./components/UI/Header";
import Tabs from "./components/UI/Tabs";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="relative z-10">
        <div className="container mx-auto p-4">
          <Header />
          <div className="my-4">
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
