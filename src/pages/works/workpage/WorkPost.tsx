import React, { useState, useEffect, ComponentType } from "react";
import { useParams } from "react-router-dom";
import NotFound from "../../../components/notfound";

const WorkPost: React.FC = () => {
  const { workSlug } = useParams<{ workSlug: string }>();
  const [WorkComponent, setWorkComponent] = useState<ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    import(`../allworkposts/${workSlug}.js`)
      .then((module) => {
        setWorkComponent(() => module.default);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Component loading failed:", error);
        setLoadError(true);
        setIsLoading(false);
      });
  }, [workSlug]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (loadError) {
    return <NotFound />;
  }

  if (!WorkComponent) {
    return <div>Error loading component</div>;
  }

  const RenderComponent = WorkComponent;
  return <RenderComponent />;
};

export default WorkPost;
