import TitleBar from "./TitleBar";

const Layout = ({ children }: any) => {
  return (
    <>
      <TitleBar />
      <div className="p-4 pb-[52px] min-h-dvh max-h-dvh overflow-auto">{children}</div>
    </>
  );
};

export default Layout;
