import TitleBar from "./TitleBar";

const Layout = ({ children }: any) => {
  return (
    <>
      <TitleBar />
      <div className="p-4 min-h-dvh max-h-dvh overflow-auto">{children}</div>
    </>
  );
};

export default Layout;
