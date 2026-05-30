import { Client, Receiver } from "@upstash/qstash";

export const qstash = new Client();

export const qstashReceiver = new Receiver();
