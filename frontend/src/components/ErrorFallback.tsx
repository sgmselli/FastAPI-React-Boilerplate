import React from "react";
import { RotateCw } from "lucide-react";
import { Logo } from "./Logo";

// Rendered outside the router, so it can't use Link or anything that needs it
export const ErrorFallback: React.FC = () => {

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex-shrink-0">
          <Logo />
        </div>
        <h1 className="text-xl font-regular text-gray-800 tracking-wide">
          FASTAPI + REACT BOILERPLATE
        </h1>
      </div>
      <p className="text-md primary-color mt-5">
        Sorry, something went wrong.
      </p>
      <div className="mt-10">
        <button
          className='btn btn-md sm:btn-lg rounded-lg fastapi-color-bg surface-color'
          onClick={() => window.location.reload()}
        >
          Reload page <span className='ml-1'><RotateCw size={20} /></span>
        </button>
      </div>
    </div>
  );
};
