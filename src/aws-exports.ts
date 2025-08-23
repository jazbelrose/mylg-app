import cfg from "./amplifyconfiguration.json";

const isNonEmpty = (obj: Record<string, unknown> | null | undefined): boolean =>
  !!obj && Object.keys(obj).length > 0;

export interface AwsConfig {
  Auth: {
    Cognito: {
      userPoolId: string;
      userPoolClientId: string;
      identityPoolId?: string;
      loginWith?: {
        oauth: {
          domain: string;
          scopes: string[];
          redirectSignIn: string;
          redirectSignOut: string;
          responseType: string;
        };
      };
    };
  };
  Storage: {
    S3: {
      bucket: string;
      region: string;
    };
  };
}

const awsConfig: AwsConfig = {
  Auth: {
    Cognito: {
      userPoolId: cfg.aws_user_pools_id,
      userPoolClientId: cfg.aws_user_pools_web_client_id,
      identityPoolId: cfg.aws_cognito_identity_pool_id,
      ...(isNonEmpty(cfg.oauth) &&
        cfg.oauth.domain && {
          loginWith: {
            oauth: {
              domain: cfg.oauth.domain,
              scopes: cfg.oauth.scope ?? ["email", "openid", "profile"],
              redirectSignIn: cfg.oauth.redirectSignIn,
              redirectSignOut: cfg.oauth.redirectSignOut,
              responseType: cfg.oauth.responseType ?? "code",
            },
          },
        }),
    },
  },
  Storage: {
    S3: {
      bucket: cfg.aws_user_files_s3_bucket,
      region: cfg.aws_user_files_s3_bucket_region || cfg.aws_project_region,
    },
  },
};

export default awsConfig;
