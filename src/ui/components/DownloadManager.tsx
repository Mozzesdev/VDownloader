import { useState } from "react";
import { cn } from "../lib/utils";
import { X } from "lucide-react";

export type Download = {
  progress: number;
  id: string;
  label: string;
  size: string;
  img?: string;
  cancel?: any;
  path?: string;
  uuid?: string;
};

export default function DownloadManager({
  downloads = [],
}: {
  downloads?: Download[];
  removeDownload?: any;
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      <div className="bg-[#313338] rounded-lg shadow-lg overflow-hidden w-fit">
        <div
          className="bg-[#404349] p-3 gap-2 flex justify-between items-center cursor-pointer"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <h3 className="text-white text-sm font-medium">Downloads</h3>
          <button
            className="text-gray-400 hover:text-white focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? "+" : "-"}
          </button>
        </div>
        {!isMinimized && (
          <div className="px-3 pt-3 max-h-72 overflow-y-auto no-scrollbar">
            {downloads.map((download: Download) => (
              <DownloadItem
                key={download.id}
                download={download}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadItem({
  download,
}: {
  download: Download;
}) {
  const isCanceled = download?.progress === -1;
  const isFinished = download?.progress >= 100;
  const isStand = download?.progress === 0;

  const openDownload = () => {
    if (download?.path) {
      window.electronAPI.openFile(download.path);
    }
  };

  return (
    <div
      className={cn(
        "bg-[#202124] rounded-md px-3 py-3 mb-3 cursor-pointer relative hover:opacity-90"
      )}
      onClick={openDownload}
    >
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="relative grid place-items-center">
          <img
            src={download.img}
            alt={download.label}
            className="w-20 h-auto"
          />
        </div>
        <div>
          <p className="text-white text-sm truncate w-60">{download.label}</p>
          <p className="text-[#9e9e9e] text-[12px] truncate">
            {download?.size || "N/A"}
          </p>
        </div>
        <button
          className="text-gray-400 hover:text-white focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            download.cancel();
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[12px] text-zinc-400",
            isFinished && "text-green-400",
            isCanceled && "text-red-400"
          )}
        >
          {download?.progress.toFixed(0) || 0}%{" "}
        </span>
        <div className="w-full rounded-full h-1 overflow-hidden flex items-center">
          {isStand ? (
            <div className="w-full h-1 rounded-full">
              <span className="w-[70%] block bg-zinc-400 h-1 rounded-full animate-progress"></span>
            </div>
          ) : (
            <div
              className={cn(
                "bg-white rounded-full h-1 transition-all duration-300 ease-in-out",
                isFinished && "bg-green-400",
                isCanceled && "bg-red-400"
              )}
              style={{ width: `${isCanceled ? 100 : download?.progress}%` }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
