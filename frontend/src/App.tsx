import { Header } from "./components/UI/Header";
import Footer from "./components/UI/Footer";
import Tabs from "./components/UI/Tabs";

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="container mx-auto flex-1 p-4">
        <Header />
        <div className="my-4">
          <Tabs />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
