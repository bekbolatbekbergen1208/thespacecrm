"use client";
import Image from "next/image";
import { useState } from "react";
export function BrandMark({ version = 0 }: { version?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      {failed ? (
        <>
          S7<span>ROBOTICS</span>
        </>
      ) : (
        <>
          <Image
            className="center-brand-image"
            src={`/api/center/brand?v=${version}`}
            alt="S7 Robotics логотипі"
            width={60}
            height={44}
            unoptimized
            onError={() => setFailed(true)}
          />
          <span>ROBOTICS</span>
        </>
      )}
    </>
  );
}
