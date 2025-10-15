// src/App.tsx

import { Outlet } from "react-router-dom";
import { TopBar } from "./components/TopBar";

function App() {
  return (
    <>
      <TopBar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
