import { parseTweetArchive } from "@/data/archive";
import { useI18n } from "@/i18n/locale-provider";
import {
  Anchor,
  BoxProps,
  rem,
  Stack,
  Text,
} from "@mantine/core";
import { Dropzone, type FileRejection } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconFileTypeJs, IconUpload, IconX } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  onImport: (tweets: Awaited<ReturnType<typeof parseTweetArchive>>) => Promise<void>;
} & BoxProps;

export default function DropzoneTweetJs({ onImport, ...props }: Props) {
  const [loading, setLoading] = useState(false);
  const { locale, t } = useI18n();

  async function handleDrop(files: File[]) {
    setLoading(true);
    try {
      const tweets = await parseTweetArchive(files[0]);
      await onImport(tweets);
    } catch (error) {
      console.error("Error processing file:", error);
      notifications.show({
        title: t("invalidFile"),
        message: t("invalidFileHelp"),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReject(files: FileRejection[]) {
    files[0].errors.forEach(() => {
      notifications.show({
        title: t("fileError", { file: files[0].file.name }),
        message: t("invalidFileHelp"),
        color: "red",
      });
    });
  }

  return (
    <Stack {...props}>
      <Dropzone.FullScreen
        active={!loading}
        activateOnClick={false}
        activateOnKeyboard={false}
        inputProps={{ "aria-label": t("uploadTitle") }}
        multiple={false}
        onDrop={handleDrop}
        onReject={handleReject}
      >
        <Stack align="center" justify="center" h="100%" gap="sm">
          <IconUpload size={64} stroke={1.5} />
          <Text fz={32} fw={700}>{t("dropAnywhere")}</Text>
          <Text c="brand.7">{t("uploadHint")}</Text>
        </Stack>
      </Dropzone.FullScreen>
      <Stack>
        <Dropzone
          inputProps={{ "aria-label": t("uploadTitle") }}
          disabled={loading}
          onDrop={handleDrop}
          onReject={handleReject}
          multiple={false}
          p="lg"
          bg="brand.0"
        >
          <Stack
            align="center"
            justify="center"
            gap="sm"
            mih={200}
            style={{ pointerEvents: "none" }}
          >
            <Dropzone.Accept>
              <IconUpload
                style={{ width: rem(42), height: rem(42), color: "var(--mantine-color-brand-6)" }}
                stroke={1.5}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX
                style={{ width: rem(42), height: rem(42), color: "var(--mantine-color-red-6)" }}
                stroke={1.5}
              />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileTypeJs
                style={{ width: rem(42), height: rem(42), color: "var(--mantine-color-brand-6)" }}
                stroke={1.5}
              />
            </Dropzone.Idle>
            <Stack gap={4} align="center">
              <Text size="xl" fw={700} ta="center" inline>
                {loading ? t("processingFile") : t("uploadTitle")}
              </Text>
              <Text size="sm" c="brand.7" ta="center" inline>{t("uploadHint")}</Text>
            </Stack>
          </Stack>
        </Dropzone>
        <Text size="sm">
          {t("uploadInstruction")} {" "}
          <Anchor
            target="_blank"
            rel="noreferrer"
            href={`https://help.x.com/${locale}/managing-your-account/how-to-download-your-x-archive`}
          >
            {t("downloadArchive")}
          </Anchor>
          .
        </Text>
      </Stack>
    </Stack>
  );
}
