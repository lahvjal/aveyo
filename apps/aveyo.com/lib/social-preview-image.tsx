/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import {
  getPublicAssetDataUri,
  siteName,
  socialHeadline,
  socialSubheadline,
  socialSupportLine
} from "@/lib/site-metadata";

export const socialImageSize = {
  width: 1200,
  height: 630
};

export async function createSocialPreviewImage() {
  const [backgroundSrc, logoSrc, iconSrc] = await Promise.all([
    getPublicAssetDataUri("images/og-preview-bg.jpg"),
    getPublicAssetDataUri("aveyo-logo.svg"),
    getPublicAssetDataUri("aveyo-icon.svg")
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "#0A1628",
          color: "#FFFFFF"
        }}
      >
        <img
          src={backgroundSrc}
          alt=""
          width={socialImageSize.width}
          height={socialImageSize.height}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.86) 44%, rgba(10,22,40,0.28) 100%)"
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 64px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.95)"
              }}
            >
              <img src={iconSrc} alt="" width={40} height={33} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#CFE4F8"
                }}
              >
                {siteName}
              </div>
              <img src={logoSrc} alt={siteName} width={310} height={68} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
            <div
              style={{
                display: "flex",
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: "-0.045em"
              }}
            >
              {socialHeadline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 32,
                lineHeight: 1.24,
                color: "#F5F3EE"
              }}
            >
              {socialSubheadline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 24,
                lineHeight: 1.42,
                color: "#DBE2E8"
              }}
            >
              {socialSupportLine}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              fontSize: 22,
              color: "#EAF4FD"
            }}
          >
            <div style={{ display: "flex" }}>Free quote available at aveyo.com</div>
            <div
              style={{
                display: "flex",
                padding: "12px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.10)"
              }}
            >
              Residential solar, batteries, and project support
            </div>
          </div>
        </div>
      </div>
    ),
    socialImageSize
  );
}
