"use client";

import { useEffect } from "react";

export function FeedbackResponseSelectAll({ page }: { page: number }) {
  useEffect(() => {
    const master = document.getElementById("select-all-responses");
    if (!(master instanceof HTMLInputElement)) return;

    const getBoxes = () => Array.from(document.querySelectorAll('input[name="responseIds"]')).filter((node): node is HTMLInputElement => node instanceof HTMLInputElement);

    const sync = () => {
      const boxes = getBoxes();
      const checked = boxes.filter((box) => box.checked).length;
      master.checked = boxes.length > 0 && checked === boxes.length;
      master.indeterminate = checked > 0 && checked < boxes.length;
    };

    const onMasterChange = () => {
      getBoxes().forEach((box) => {
        box.checked = master.checked;
      });
      master.indeterminate = false;
    };

    master.addEventListener("change", onMasterChange);
    const boxes = getBoxes();
    boxes.forEach((box) => box.addEventListener("change", sync));
    sync();

    return () => {
      master.removeEventListener("change", onMasterChange);
      boxes.forEach((box) => box.removeEventListener("change", sync));
    };
  }, [page]);

  return null;
}
