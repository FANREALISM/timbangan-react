import { useState, useCallback, useRef } from "react";

/**
 * Hook to handle raw data from scale with buffering and stabilization
 */
export const useScaleData = () => {
  const [weight, setWeight] = useState("0.000");
  const [unit, setUnit] = useState("kg");
  const dataBufferRef = useRef("");

  const handleData = useCallback(async (data) => {
    let rawStr = "";

    if (typeof data === "string") {
      rawStr = data;
    } else if (data instanceof Blob) {
      rawStr = await data.text();
    } else if (data instanceof ArrayBuffer) {
      rawStr = new TextDecoder().decode(data);
    } else {
      rawStr = String(data);
    }

    dataBufferRef.current += rawStr;

    const match = dataBufferRef.current.match(
      /([-+]?\d+\.?\d*)\s*(kg|g|lb|oz)/gi,
    );

    if (match) {
      const latestMatch = match[match.length - 1];
      const detailMatch = latestMatch.match(/([-+]?\d+\.?\d*)\s*(kg|g|lb|oz)/i);

      if (detailMatch) {
        const rawWeight = detailMatch[1];
        const newUnit = detailMatch[2].toLowerCase();

        // Format based on unit: Grams (0 decimals), others (3 decimals)
        const parsedWeight = parseFloat(rawWeight);
        const formattedWeight =
          newUnit === "g"
            ? Math.round(parsedWeight).toString()
            : parsedWeight.toFixed(3);

        setWeight(formattedWeight);
        setUnit(newUnit);
      }

      const lastIndex = dataBufferRef.current.lastIndexOf(latestMatch);
      dataBufferRef.current = dataBufferRef.current.slice(
        lastIndex + latestMatch.length,
      );
    }

    if (dataBufferRef.current.length > 150) {
      dataBufferRef.current = dataBufferRef.current.slice(-50);
    }
  }, []);

  const resetData = useCallback(() => {
    setWeight("0.000");
    dataBufferRef.current = "";
  }, []);

  return { weight, unit, handleData, resetData };
};
