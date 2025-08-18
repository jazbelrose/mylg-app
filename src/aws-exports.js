// src/aws-exports.v6.js
import cfg from "./amplifyconfiguration.json"; // <-- put your JSON in this file

function isNonEmpty(obj) {
  return obj && Object.keys(obj).length > 0;
}

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: cfg.aws_user_pools_id,
      userPoolClientId: cfg.aws_user_pools_web_client_id,
      identityPoolId: cfg.aws_cognito_identity_pool_id,
      // Only include OAuth if your JSON actually has a domain/values
      ...(isNonEmpty(cfg.oauth) && {
        loginWith: {
          oauth: {
            // If you later add Hosted UI settings, map them here:
            // domain: cfg.oauth.domain,
            // scopes: cfg.oauth.scope || ["email", "openid", "profile"],
            // redirectSignIn: cfg.oauth.redirectSignIn,
            // redirectSignOut: cfg.oauth.redirectSignOut,
            // responseType: cfg.oauth.responseType || "code",
          },
        },
      }),
    },
  },
  // Add REST only if you use it; otherwise omit API entirely
  // API: {
  //   REST: {
  //     endpoints: [
  //       { name: "default", endpoint: import.meta.env.VITE_API_BASE_URL, region: cfg.aws_project_region }
  //     ],
  //   },
  // },
  Storage: {
    S3: {
      bucket: cfg.aws_user_files_s3_bucket,
      region: cfg.aws_user_files_s3_bucket_region || cfg.aws_project_region,
    },
  },
};

export default awsConfig;
