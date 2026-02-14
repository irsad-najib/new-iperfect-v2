"use client";

import { Button, Form, message, Checkbox, Input } from "antd";
import { useState } from "react";
import { login } from "@/services/api/auth.service";
import { setAccessToken } from "@/utils/auth";
import { ROUTES } from "@/constants";
import Image from "next/image";

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  const handleLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true);

      const response = await login({
        username: values.username,
        password: values.password,
      });

      if (response.status_code === 200) {
        setAccessToken(response, values.remember ?? false);
        message.success(response.message);
        window.location.href = ROUTES.DAILY_ROUTINES;
      } else {
        message.error("Login failed. Please check your credentials.");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Login failed. Please try again later.";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center flex-col bg-slate-50 justify-center">
      <div className="mb-10">
        <Image
          src="/iperfect-logo.svg"
          alt="iPerfect Logo"
          width={200}
          height={40}
        />
      </div>

      <div className="bg-white p-8 rounded-xl w-full max-w-lg shadow-lg">
        <h1 className="text-2xl font-semibold text-black">Login</h1>
        <p className="text-gray-500 mt-2 mb-6">Welcome back onboard! 👋</p>

        <Form
          layout="vertical"
          className="w-full"
          form={form}
          onFinish={handleLogin}
          initialValues={{ remember: false }}>
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: "Please input your username!" },
            ]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
            ]}>
            <Input.Password size="large" />
          </Form.Item>

          <div className="flex justify-between items-center mb-6">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <a href="#" className="text-orange-300">
              Forgot password?
            </a>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}>
            Login
          </Button>

          <div className="relative text-center my-6">
            <div className="absolute top-1/2 left-0 w-[45%] h-px bg-[#e8e8e8]"></div>
            <span className="bg-white px-2.5 text-neutral-500 text-sm relative z-10">
              or login with Google
            </span>
            <div className="absolute top-1/2 right-0 w-[45%] h-px bg-[#e8e8e8]"></div>
          </div>

          <Button block size="large" className="mb-6 border-neutral-700">
            Login with Google
          </Button>

          <p className="text-center m-0 text-neutral-500">
            Not registered yet?{" "}
            <a href="#" className="text-secondary-300 no-underline font-medium">
              Contact admin
            </a>
          </p>
        </Form>
      </div>
    </div>
  );
}
