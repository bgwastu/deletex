import { ThemeIcon } from "@mantine/core";
import { IconTrashX } from "@tabler/icons-react";

export default function DeleteXIcon({ size = 34 }: { size?: number }) {
  return (
    <ThemeIcon
      size={size}
      radius="sm"
      color="brand.9"
      variant="filled"
    >
      <IconTrashX size={size * 0.58} stroke={2.2} />
    </ThemeIcon>
  );
}
