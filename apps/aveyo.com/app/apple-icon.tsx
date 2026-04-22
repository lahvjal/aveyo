/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getPublicAssetDataUri } from "@/lib/site-metadata";

export const runtime = "nodejs";
export const size = {
  width: 180,
  height: 180
};
export const contentType = "image/png";

export default async function AppleIcon() {
  const iconSrc = await getPublicAssetDataUri("aveyo-icon.svg");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F5F3EE 100%)"
        }}
      >
        <img src={iconSrc} alt="Aveyo icon" width={118} height={98} />
      </div>
    ),
    size
  );
}
