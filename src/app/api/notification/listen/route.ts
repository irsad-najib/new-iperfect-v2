import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    const user_id = requestBody.user_id;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "Invalid user ID (must be a string)" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "User ID received and processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing POST request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
