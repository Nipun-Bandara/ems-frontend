export const Footer = () => {
  return (
    <footer className="bg-backgroundSecondary rounded-xl shadow-xs p-8 mt-12 sm:mt-12 md:mt-12 lg:mt-20 px-4 sm:px-6 md:px-12 lg:px-12 w-full max-w-7xl mx-auto border-none">
      <div className="">
        <div className="sm:flex sm:items-center sm:justify-between">
          <a
            href="#"
            className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse"
          >
            <span className="text-heading self-center text-2xl font-semibold whitespace-nowrap">
              Shiftly
            </span>
          </a>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-body sm:mb-0">
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                Employee Handbook
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                Help Center
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                IT Support
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline">
                Contact HR
              </a>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-default sm:mx-auto lg:my-8" />
        <span className="block text-sm text-body sm:text-center">
          © {new Date().getFullYear()}{" "}
          <a href="#" className="hover:underline">
            Shiftly by Creative Software
          </a>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
};
