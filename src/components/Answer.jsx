import { useEffect, useState } from "react";
import { checkHeading } from "./helper";

const Answer = ({ ans }) => {   
  const [heading, setHeading] = useState(false);

  useEffect(() => {
    if (checkHeading(ans)) {
      setHeading(true);
    }
  }, [ans]);   

  return (
    <div>
      {heading ? (
        <span className="pt-3 text-lg block font-semibold text-blue-400">
          {ans}
        </span>
      ) : (
        <span className="pl-5 text-gray-200">{ans}</span>
      )}
    </div>
  );
};

export default Answer;
