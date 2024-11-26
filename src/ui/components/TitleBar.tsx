import { Minus, Square, X } from "lucide-react";

const TitleBar = () => {
  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  return (
    <div className="flex justify-between gap-2 items-center h-9 bg-background-secondary text-white select-none drag">
      <div className="pl-2 w-[120px]">
        <img src="./icon.png" className="h-auto w-5" />
      </div>

      <div className="flex items-center hover:bg-[#383838] cursor-pointer bg-[#333333] text-[#CCCCCC] h-6 px-2 py-1 space-x-2 no-drag rounded-lg w-full max-w-[450px] border border-solid border-zinc-600">
        <input
          type="text"
          placeholder="Search"
          className="bg-transparent text-zinc-300 h-full cursor-pointer flex-1 focus:outline-none focus:ring-0 text-sm placeholder:text-sm placeholder:text-center"
        />
      </div>

      <div className="h-full flex">
        <button
          onClick={handleMinimize}
          className="h-full w-[40px] px-3 flex justify-center items-center hover:bg-gray-700 no-drag"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full w-[40px] px-3 flex justify-center items-center hover:bg-gray-700 no-drag"
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="h-full w-[40px] px-3 flex justify-center items-center hover:bg-red-600 no-drag"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
