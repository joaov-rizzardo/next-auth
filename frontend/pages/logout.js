import { useRouter } from "next/router";
import { tokenService } from "../src/services/auth/tokenService";
import React from "react";
import { HttpClient } from "../src/infra/HttpClient/HttpClient";

export default function logoutPage() {
  const router = useRouter();

  React.useEffect(() => {
    try {
      HttpClient("/api/refresh", {
        method: "DELETE",
      });
      tokenService.delete();
      router.push("/");
    } catch (error) {
      alert(error.message);
    }
  }, []);

  return <div>Você será redirecionado em instantes...</div>;
}
