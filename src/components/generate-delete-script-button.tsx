"use client";

import { CodeHighlight } from "@mantine/code-highlight";
import {
  Button,
  CopyButton,
  Modal,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy, IconFileTypeJs } from "@tabler/icons-react";

export default function GenerateDeleteScriptButton({
  tweetIds,
}: {
  tweetIds: string[];
}) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <div>
      <Modal opened={opened} onClose={close} title="Delete Script" size="lg">
        <Stack>
          <Stack gap="0">
            <Text size="sm" c="dimmed">
              STEP 1
            </Text>
            <Text>{`
            Open your browser's console (usually by pressing F12 or
            right-clicking on the page and selecting "Inspect" or "Inspect
            Element", then navigating to the "Console" tab).
          `}</Text>
          </Stack>
          <Stack gap="0">
            <Text size="sm" c="dimmed">
              STEP 2
            </Text>
            <Text>Paste the script into the console and press Enter.</Text>
          </Stack>
          <ScrollArea h={300} type="always" scrollbars="y" offsetScrollbars>
            <CodeHighlight code={generate(tweetIds)} language="js" w={580} />
          </ScrollArea>
          <CopyButton value={generate(tweetIds)}>
            {({ copied, copy }) => (
              <Button
                color={copied ? "green.7" : "brand"}
                onClick={copy}
                leftSection={
                  copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                }
              >
                {copied ? "Script Copied!" : "Copy to Clipboard"}
              </Button>
            )}
          </CopyButton>
        </Stack>
      </Modal>
      <Button
        onClick={open}
        leftSection={<IconFileTypeJs size={18} />}
        color="brand"
      >
        Generate Delete Script
      </Button>
    </div>
  );
}

export function generate(tweetIds: string[]) {
  return `
var TweetDeleter = {
  deleteURL: "https://x.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet",
  lastHeaders: {},
  tIds: [${tweetIds.map((id) => `"${id}"`).join(", ")}],
  dCount: 0,

  init: function() {
    this.initXHR();
    this.confirmDeletion();
  },

  initXHR: function() {
    var XHR_OpenOriginal = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      if (arguments[1] && arguments[1].includes("DeleteTweet")) {
        TweetDeleter.deleteURL = arguments[1];
      }
      XHR_OpenOriginal.apply(this, arguments);
    };

    var XHR_SetRequestHeaderOriginal =
      XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (a, b) {
      TweetDeleter.lastHeaders[a] = b;
      XHR_SetRequestHeaderOriginal.apply(this, arguments);
    };
  },

  confirmDeletion: async function() {
    if (
      confirm("Are you sure you want to delete " + this.tIds.length + " tweets?")
    ) {
      this.deleteTweets();
    }
  },

  deleteTweets: async function() {
    while (!("authorization" in this.lastHeaders)) {
      await this.sleep(1000);
      console.log("Waiting for authorization...");
    }

    console.log("Starting deletion...");

    while (this.tIds.length > 0) {
      this.tId = this.tIds.pop();
      try {
        let response = await fetch(this.deleteURL, {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.5",
            authorization: this.lastHeaders.authorization,
            "content-type": "application/json",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-client-transaction-id":
              this.lastHeaders["X-Client-Transaction-Id"],
            "x-client-uuid": this.lastHeaders["x-client-uuid"],
            "x-csrf-token": this.lastHeaders["x-csrf-token"],
            "x-twitter-active-user": "yes",
            "x-twitter-auth-type": "OAuth2Session",
            "x-twitter-client-language": "en",
          },
          referrer: "https://x.com/" + document.location.href.split("/")[3] + "/with_replies",
          referrerPolicy: "strict-origin-when-cross-origin",
          body: '{"variables":{"tweet_id":"' + this.tId + '","dark_request":false},"queryId":"' + this.deleteURL.split("/")[6] + '"}',
          method: "POST",
          mode: "cors",
          credentials: "include",
        });

        if (response.status == 200) {
          this.dCount++;
          console.log("Deleted tweet ID: " + this.tId);
        } else {
          console.log("Failed to delete tweet ID: " + this.tId, response);
        }
      } catch (error) {
        console.log("Error deleting tweet ID: " + this.tId, error);
      }
    }

    console.log("Tweet deletion complete!");
    alert("Tweet deletion complete!");
  },

  sleep: function(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  },
};

TweetDeleter.init();`;
}
