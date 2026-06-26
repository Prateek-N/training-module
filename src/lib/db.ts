import mongoose from "mongoose";
import dns from "dns";
import fs from "fs";
import path from "path";

// Read from .env directly to bypass any parent process env pollution
function getEnvUri(): string | null {
  try {
    const cwd = process.cwd();
    const envPath = path.join(cwd, ".env");
    console.log("getEnvUri diagnostic - cwd:", cwd);
    console.log("getEnvUri diagnostic - envPath:", envPath);
    console.log("getEnvUri diagnostic - exists:", fs.existsSync(envPath));
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      console.log("getEnvUri diagnostic - content length:", content.length);
      const match = content.match(/^MONGODB_URI\s*=\s*([^\r\n]+)/m);
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (err) {
    console.error("Error reading .env file directly:", err);
  }
  return null;
}

const MONGODB_URI = getEnvUri() || process.env.MONGODB_URI || "mongodb://localhost:27017/training-onboarding";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function getConnectionString(uri: string): Promise<string> {
  console.log("getConnectionString called with:", uri);
  if (!uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  return new Promise((resolve) => {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/?(.*)$/);
    if (!match) {
      console.log("Atlas URI matching failed, using original.");
      return resolve(uri);
    }

    const [, user, pass, host, rest] = match;

    const resolver = new dns.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    resolver.resolveSrv(`_mongodb._tcp.${host}`, (err, addresses) => {
      if (err) {
        console.error("DNS SRV resolution failed. Falling back to default URI:", err.message);
        return resolve(uri);
      }

      const hostports = addresses.map((a) => `${a.name}:${a.port}`).join(",");
      const queryChar = rest.includes("?") ? "&" : "?";
      const resolvedUri = `mongodb://${user}:${pass}@${hostports}/${rest || ""}${queryChar}ssl=true&authSource=admin`;
      console.log("Successfully resolved Atlas URI to:", resolvedUri.replace(pass, "****"));
      resolve(resolvedUri);
    });
  });
}

export async function connectToDatabase() {
  console.log("connectToDatabase called. MONGODB_URI configured as:", MONGODB_URI);
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = getConnectionString(MONGODB_URI)
      .then((resolvedUri) => {
        console.log("Connecting Mongoose to resolved URI...");
        return mongoose.connect(resolvedUri, opts);
      })
      .then((mongooseInstance) => {
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
