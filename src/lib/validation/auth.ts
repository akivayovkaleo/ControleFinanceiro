import { z } from 'zod';
import { isCommonPassword } from '@/lib/auth/password-policy';
import { shortText } from './shared';

/**
 * Regra de senha.
 *
 * Comprimento mínimo generoso (10) em vez de exigências barrocas de símbolos:
 * o NIST SP 800-63B mostra que regras de composição levam a "Senha123!" —
 * previsível — enquanto o tamanho é o que realmente aumenta o custo do ataque.
 * O que barramos além do tamanho são as senhas notoriamente óbvias.
 */
export const passwordSchema = z
  .string()
  .min(10, 'A senha precisa de pelo menos 10 caracteres')
  .max(200, 'A senha é longa demais')
  .refine((p) => !isCommonPassword(p), 'Essa senha é muito comum. Escolha outra.')
  .refine((p) => p.trim().length > 0, 'A senha não pode ser só espaços');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail')
  .max(200, 'E-mail longo demais')
  .pipe(z.email('E-mail inválido'));

export const signupSchema = z
  .object({
    name: shortText(80, 'seu nome'),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não são iguais',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  // No login não aplicamos a regra de força: senhas antigas continuam válidas,
  // e recusar aqui por "fraca" só vazaria informação sobre a política.
  password: z.string().min(1, 'Informe sua senha'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'As senhas não são iguais',
    path: ['newPasswordConfirm'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  });

export const profileSchema = z.object({
  name: shortText(80, 'seu nome'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
});
