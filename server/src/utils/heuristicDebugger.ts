interface HeuristicDiagnosis {
  diagnosis: string;
  suggestedFix: string;
}

export const getHeuristicDiagnosis = (
  errorMessage: string,
  statusCode: number | null
): HeuristicDiagnosis | null => {
  const msg = (errorMessage || "").toLowerCase();

  // 1. SSL/TLS Certificate Mismatch
  if (msg.includes("altnames") || msg.includes("hostname/ip does not match")) {
    return {
      diagnosis: "SSL/TLS Certificate Mismatch Error. The server presented a certificate that does not match the hostname you are trying to reach.",
      suggestedFix: "Check if you are using the correct hostname. If you are using a proxy or custom domain, ensure the certificate includes the domain you are calling. Alternatively, try using HTTP if the server supports it and security is not a concern for testing.",
    };
  }

  // 2. Self-Signed Certificate
  if (msg.includes("self signed certificate") || msg.includes("unable to verify the first certificate")) {
    return {
      diagnosis: "The server is using a Self-Signed Certificate or an untrusted Certificate Authority (CA).",
      suggestedFix: "Ensure the server has a valid SSL certificate. For local testing, you might need to disable SSL verification in your client environment (though this is not recommended for production).",
    };
  }

  // 3. Connection Refused
  if (msg.includes("econnrefused")) {
    return {
      diagnosis: "Connection Refused. The server is not listening on the specified port or the service is down.",
      suggestedFix: "Verify that the server is running and that you are using the correct Port and Hostname. If the server is behind a firewall, ensure the port is open.",
    };
  }

  // 4. DNS / Not Found
  if (msg.includes("enotfound") || msg.includes("getaddrinfo")) {
    return {
      diagnosis: "DNS Lookup Failed. The hostname could not be resolved.",
      suggestedFix: "Check for typos in the URL hostname. Ensure you are connected to the internet and that the domain exists.",
    };
  }

  // 5. Timeout
  if (msg.includes("timeout") || msg.includes("etimedout")) {
    return {
      diagnosis: "Request Timed Out. The server took too long to respond.",
      suggestedFix: "The server might be overloaded or processing a very heavy request. Check your network connection and server logs. You may need to increase the timeout limit if the endpoint is slow by design.",
    };
  }

  // 6. Common 401 Unauthorized
  if (statusCode === 401) {
    return {
      diagnosis: "Authentication Required. Your request lacks valid credentials.",
      suggestedFix: "Check your 'Authorization' header. Ensure the token is correctly formatted (e.g. 'Bearer <token>') and has not expired.",
    };
  }

  // 7. Common 403 Forbidden
  if (statusCode === 403) {
    return {
      diagnosis: "Access Forbidden. Your credentials are valid, but you don't have permission to access this resource.",
      suggestedFix: "Verify your API key permissions or user roles. Some endpoints require specific scopes or admin privileges.",
    };
  }

  return null;
};
