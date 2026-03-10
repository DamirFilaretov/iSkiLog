import { Capacitor } from "@capacitor/core"

type NativeShareArgs = {
  filename: string
  mimeType: string
  blob: Blob
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Unable to convert file to base64."))
        return
      }
      const base64 = result.split(",")[1]
      if (!base64) {
        reject(new Error("Invalid base64 conversion result."))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("File read failed."))
    reader.readAsDataURL(blob)
  })
}

export function isNativeAppRuntime() {
  const platform = Capacitor.getPlatform()
  return platform === "android" || platform === "ios"
}

export async function shareFileFromBlobNative(args: NativeShareArgs) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share")
  ])

  const safeFilename = sanitizeFilename(args.filename)
  const path = `exports/${Date.now()}_${safeFilename}`
  const data = await blobToBase64(args.blob)

  const written = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    recursive: true
  })

  await Share.share({
    title: "iSkiLog Report",
    text: args.filename,
    url: written.uri,
    dialogTitle: "Share report"
  })
}
