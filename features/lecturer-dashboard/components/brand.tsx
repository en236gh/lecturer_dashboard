import Image from "next/image";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  const size = inverse ? 160 : 112;

  return (
    <div className="flex flex-col items-center" aria-label="University of Zambia">
      <Image
        src="/UNZA.png"
        alt="The University of Zambia"
        width={316}
        height={316}
        priority={inverse}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
