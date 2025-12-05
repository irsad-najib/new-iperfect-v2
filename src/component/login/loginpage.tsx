"use client";
import { Button, Form, message, Checkbox, Input } from "antd";
import { useState } from "react";
import api from "@/utils/axios";
import { setAccessToken } from "@/utils/auth";
import Image from "next/image";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLogin = async (values: any) => {
    try {
      setLoading(true);

      const response = await api.post("/login", {
        username: values.username,
        password: values.password,
      });
      if (response.data.status_code === 200) {
        // Store API key and access token
        setAccessToken(response.data, values.remember);
        message.success(response.data.message);

        // Force a page reload and redirect
        window.location.href = "/daily-routines";
      } else {
        message.error("Login failed. Please check your credentials.");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Login failed. Please try again later.";
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
        <h1 className="text-2xl font-semibold text-black"> Login</h1>
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
              //   { type: "email", message: "Please enter a valid email!" },
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
            <span className="bg-white px-2.5 text-[#777986] text-sm relative z-10">
              or login with Google
            </span>
            <div className="absolute top-1/2 right-0 w-[45%] h-px bg-[#e8e8e8]"></div>
          </div>

          <Button
            block
            size="large"
            className="mb-6 border border-[#404252]"
            style={{ borderColor: "#404252" }}>
            Login with Google
          </Button>

          <p className="text-center m-0 text-[#777986]">
            Not registered yet?{" "}
            <a href="#" className="text-[#f47920] no-underline font-medium">
              Contact admin
            </a>
          </p>
        </Form>
      </div>
    </div>
  );
};
export default LoginPage;
