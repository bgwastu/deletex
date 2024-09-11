"use client";

import { Repl } from "@electric-sql/pglite-repl";
import { client } from "@/database/db";
import { Container } from "@mantine/core";

export default function Page() {
  return (
    <Container mt="xl">
      <Repl pg={client} />
    </Container>
  );
}
