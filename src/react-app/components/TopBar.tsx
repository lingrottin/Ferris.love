export function TopBar() {
  return (
    <>
      <div
        className={
          "h-20 flex items-center border-b-1 fixed top-0 left-0 right-0 bg-white"
        }
      >
        <div className="flex-1 ml-7 text-xl font-mono font-bold">
          Ferris.love
        </div>
        <div className="flex-3 mr-7 flex flex-row justify-end"></div>
      </div>
      <div className={"mb-20"}></div>
    </>
  );
}
