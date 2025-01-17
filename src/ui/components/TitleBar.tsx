import { Minus, Search, Square, X } from "lucide-react";
import { useState } from "react";
import logo from "../../../icon.png"

const TitleBar = () => {
  const [searchFocus, setSearchFocus] = useState(false);
  const handleMinimize = () => window.electronAPI.minimize();
  const handleMaximize = () => window.electronAPI.maximize();
  const handleClose = () => window.electronAPI.close();

  const switchFocus = () => setSearchFocus(!searchFocus);

  return (
    <div className="flex justify-between gap-2 items-center h-9 bg-background text-white select-none drag sticky top-0 bg-[var(--background)] z-50">
      <div className="pl-2 w-[120px]">
        <img src={logo} className="h-auto w-5" />
      </div>

      <div className="flex items-center justify-center relative hover:bg-[#383838] cursor-pointer bg-[#333333] text-[#CCCCCC] h-6 px-2 py-1 space-x-2 no-drag rounded-lg w-full max-w-[450px] border border-solid border-zinc-600">
        <label
          htmlFor="video-search"
          className={`${
            searchFocus && "opacity-0"
          } text-sm gap-1.5 absolute left-[50%] pointer-events-none -translate-x-[50%] text-[#747474] flex items-center justify-center`}
        >
          <Search className="w-4" color="#747474" />
          Search
        </label>
        <input
          onFocus={switchFocus}
          onBlur={switchFocus}
          type="text"
          placeholder="Search"
          name="video-search"
          className="bg-transparent text-zinc-300 h-full cursor-pointer flex-1 focus:outline-none focus:ring-0 text-sm placeholder:opacity-0"
        />
      </div>
      <div className="h-full flex mt-[1px]">
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
