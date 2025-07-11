import { useState, useEffect } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { TextInput, Spinner } from '@inkjs/ui';
import { streamPage } from '@page-builder/core';
import dotenv from 'dotenv';
import { useChat } from '@ai-sdk/react';
import { StreamChatTransport } from './lib/StreamChatTransport';

import findConfig from 'find-config';
import { FileStorage } from '@page-builder/core/storage';
import {
  CachedComponentsProvider,
  SitecoreGraphqlAuthoringComponentsProvider,
} from '@page-builder/core/components';

dotenv.config({ path: findConfig('.env') });

const transport = new StreamChatTransport(({ messages }) =>
  streamPage(
    { messages },
    new CachedComponentsProvider(
      new SitecoreGraphqlAuthoringComponentsProvider(
        {
          accessToken: process.env.SITECORE_GRAPHQL_ACCESS_TOKEN!,
          baseUrl: process.env.SITECORE_GRAPHQL_BASE_URL!,
        },
        process.env.SITECORE_SITE!,
      ),
      ['.sitecore', process.env.SITECORE_SITE!],
    ),
    new FileStorage(['.sitecore', 'pages']),
  ),
);

const PageBuilder = () => {
  const [error, setError] = useState<string>();
  const [input, setInput] = useState<string>('');

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      console.error('Error:', error);
      setError(error.message);
    },
  });

  const { exit } = useApp();
  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  useEffect(() => {
    sendMessage({
      text: 'Generate a page for a blog about React development.',
    });
  }, []);

  const output =
    messages && messages.length
      ? messages
          .map(
            (message) =>
              `${message.role}:  ${JSON.stringify(message.parts)}
        `,
          )
          .join('\n')
      : '';

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="cyanBright">Page Builder CLI</Text>
      </Box>
      <Box>
        {!error && <Text color="green">{output}</Text>}
        {error && <Text color="red">{error}</Text>}
      </Box>
      <Box>{status !== 'ready' && <Spinner label={status} />}</Box>
      {status === 'ready' && (
        <TextInput
          placeholder="Type your answer here..."
          onSubmit={() => sendMessage({ text: input })}
          onChange={setInput}
        />
      )}
    </Box>
  );
};

render(<PageBuilder />);
