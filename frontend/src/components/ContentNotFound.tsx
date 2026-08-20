import React from "react";
import { Logo } from "./Logo";
import { MoveRight } from "lucide-react";
import { Link } from "react-router-dom";

export const ContentNotFound: React.FC = () => {

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[70vh]">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex-shrink-0">
          <Logo />
        </div>
        <h1 className="text-xl font-regular text-gray-800 tracking-wide">
          FASTAPI + REACT BOILERPLATE
        </h1>
      </div>
      <p className="text-md primary-color mt-5">
        Sorry, we couldn't find what you were looking for.
      </p>
      <div className="mt-10">
        <Link to="/"><button className='btn btn-md sm:btn-lg rounded-lg fastapi-color-bg surface-color'>Back to home <span className='ml-1'><MoveRight size={20} /></span></button></Link>
      </div>

    </div>
  );
};