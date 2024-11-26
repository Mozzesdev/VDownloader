import { X } from "lucide-react";
import { useEffect } from "react";

export type AlertType = "info" | "success" | "warning" | "error";

interface Alert {
  id: number;
  type: AlertType;
  message: string;
  delay?: number;
}

const Alert = ({ alert, onClose }: { alert: Alert; onClose: () => void }) => {
  const bgColors = {
    info: "bg-[#5865F2]",
    success: "bg-[#4bce75]",
    warning: "bg-[#FEE75C]",
    error: "bg-[#ED4245]",
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, alert.delay);

    return () => clearTimeout(timer);
  }, [onClose, alert.delay]);

  return (
    <div
      className={`${bgColors[alert.type]} ${
        alert.type === "warning" ? "text-black" : "text-white"
      } p-3 rounded-md shadow-lg flex justify-between items-center mb-2 animate-slide-in`}
    >
      <span>{alert.message}</span>
      <button onClick={onClose} className="ml-2 focus:outline-none">
        <X size={18} />
      </button>
    </div>
  );
};

export default Alert;
