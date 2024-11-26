import TitleBar from "./TitleBar";

const Layout = ({ children }: any) => {
  return (
    <div>
      <TitleBar />
      {children}
    </div>
  );
};

export default Layout;
