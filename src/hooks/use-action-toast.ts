"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

type ActionToastState = {
  error?: string | null;
  success?: string | null;
};

export function useActionToast(state: ActionToastState, isPending: boolean) {
  const lastToastedState = useRef<ActionToastState | null>(null);

  useEffect(() => {
    if (isPending || lastToastedState.current === state) {
      return;
    }

    lastToastedState.current = state;

    if (state.error) {
      toast.error(state.error);
      return;
    }

    if (state.success) {
      toast.success(state.success);
    }
  }, [state, isPending]);
}
