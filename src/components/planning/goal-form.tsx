'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveGoalAction } from '@/server/actions/planning';
import { idleState } from '@/server/actions/types';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field, Input } from '@/components/ui/field';
import { ColorPicker } from '@/components/ui/color-picker';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export function GoalForm({ spaceId }: { spaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(saveGoalAction, idleState);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova meta
      </Button>
    );
  }

  return (
    <Card className="mb-5">
      <CardBody>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="spaceId" value={spaceId} />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Field label="Nome da meta" htmlFor="goal-name" error={state.fieldErrors?.name} required>
            <Input
              id="goal-name"
              name="name"
              placeholder="Viagem de fim de ano"
              maxLength={60}
              autoFocus
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quanto vocês querem juntar"
              htmlFor="goal-target"
              error={state.fieldErrors?.targetCents}
              required
            >
              <Input
                id="goal-target"
                name="targetCents"
                inputMode="decimal"
                placeholder="5.000,00"
                required
              />
            </Field>

            <Field
              label="Até quando"
              htmlFor="goal-date"
              error={state.fieldErrors?.targetDate}
              hint="Opcional"
            >
              <Input id="goal-date" name="targetDate" type="date" />
            </Field>
          </div>

          <ColorPicker name="color" label="Cor" />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <SubmitButton className="flex-1" pendingLabel="Criando…">
              Criar meta
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
