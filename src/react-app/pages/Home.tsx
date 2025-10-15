import { SiGithub } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="pl-5 pr-5 text-center text-5xl/15 font-bold">
        <img
          className="h-27 mb-7 mt-7 inline-block"
          src="https://r2.enita.cn/rustacean-flat-noshadow.svg"
          alt="Ferris the crab"
        />
        <br />
        <span>
          Show how you love <br />
          <span className="text-6xl font-black text-orange-600">Ferris</span>
        </span>
      </div>
      <div className="mt-7 h-35 w-80 p-5 bg-orange-50 border-1 border-orange-200 rounded-xl">
        should be the example of the card
      </div>
      <Button
        variant="outline"
        type="button"
        className="mt-7 cursor-pointer"
        onClick={() => {
          window.location.href = "/api/invoke-github-setup";
        }}
      >
        <SiGithub size={24} /> Connect with GitHub
      </Button>
    </div>
  );
}
