import TitleBar from "./TitleBar";

const Layout = ({ children }: any) => {
  return (
    <div>
      <TitleBar />
      <div className="p-4">{children}</div>
    </div>
  );
};

export default Layout;
