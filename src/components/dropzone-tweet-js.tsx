import { Tweet, TweetMedia } from "@/database/schema";
import {
  Anchor,
  BoxProps,
  Flex,
  Group,
  Pill,
  rem,
  Stack,
  Text,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { IconFileTypeJs, IconUpload, IconX } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  tweets: TweetMedia[] | null;
  setTweets: (tweets: TweetMedia[] | null) => void;
} & BoxProps;

export default function DropzoneTweetJs({
  tweets,
  setTweets,
  ...props
}: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  return (
    <Stack {...props}>
      {file === null ? (
        <Stack>
          <Text>
            Before continuing, you need to import tweets.js file from your X
            archive.{" "}
            <Anchor
              target="_blank"
              href="https://help.x.com/en/managing-your-account/how-to-download-your-x-archive"
            >
              See how to download it
            </Anchor>
            .
          </Text>
          <Dropzone
            disabled={loading || file !== null}
            onDrop={async (files) => {
              setLoading(true);
              try {
                const tweets = await fileToTweets(files[0]);
                console.log(tweets);
                setFile(files[0]);
                setTweets(tweets);
              } catch (error: any) {
                notifications.show({
                  title: "Error",
                  message: error.message,
                  color: "red",
                });
              } finally {
                setLoading(false);
              }
            }}
            onReject={(files) => {
              files[0].errors.map((e) => {
                notifications.show({
                  title: `Error on file ${files[0].file.name}`,
                  message: e.message,
                  color: "red",
                });
              });
            }}
            multiple={false}
            accept={["application/javascript", "text/javascript", "text/plain"]}
          >
            <Group
              justify="center"
              gap="xl"
              mih={220}
              style={{ pointerEvents: "none" }}
            >
              <Dropzone.Accept>
                <IconUpload
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-brand-6)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-red-6)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconFileTypeJs
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-brand-6)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Idle>
              <Stack gap="xs">
                <Text size="xl" inline>
                  Upload your tweets.js file
                </Text>
                <Text size="sm" c="dimmed" inline>
                  You can also drag and drop the file here
                </Text>
              </Stack>
            </Group>
          </Dropzone>
        </Stack>
      ) : (
        <Stack>
          <Flex>
            <Pill
              size="lg"
              bg="brand.1"
              withRemoveButton
              removeButtonProps={{
                onClick: () => {
                  setFile(null);
                  setTweets(null);
                },
              }}
            >
              {file?.name} ({tweets?.length} posts)
            </Pill>
          </Flex>
          <Stack gap="xs">
            <Text>
              Posts:{" "}
              <Text span fw={600}>
                {tweets?.filter((t) => !t.isReply && !t.isRetweet).length} posts
              </Text>
            </Text>
            <Text>
              Retweets:{" "}
              <Text span fw={600}>
                {tweets?.filter((t) => t.isRetweet).length} posts
              </Text>
            </Text>
            <Text>
              Replies:{" "}
              <Text span fw={600}>
                {tweets?.filter((t) => t.isReply).length} posts
              </Text>
            </Text>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

async function fileToTweets(file: File): Promise<TweetMedia[]> {
  const content = await file.text();
  const jsonString = content.replace(/^window\.YTD\.tweets\.part0 = /, "");
  if (!jsonString) throw new Error("Invalid tweets.js file");

  try {
    const data = JSON.parse(jsonString);

    return data.map((data: any) => {
      const tweet = data.tweet;
      return {
        id: tweet.id_str,
        text: tweet.full_text,
        retweet: Number(tweet.retweet_count),
        likes: Number(tweet.favorite_count),
        isReply: tweet.in_reply_to_status_id_str !== undefined,
        isRetweet: tweet.full_text.startsWith("RT @"),
        createdAt: new Date(tweet.created_at),
        media: [...(tweet.extended_entities?.media || [])].map(
          (media: any) => ({
            id: media.id_str,
            tweetId: tweet.id_str,
            previewUrl: media.media_url_https,
            type: media.type,
          })
        ),
      } as TweetMedia;
    });
  } catch (error) {
    console.error(error);
    throw new Error("Invalid tweets.js file");
  }
}
