import { PasskeyManager } from "@/components/admin/passkey-manager";
import { SettingsForm } from "@/components/admin/settings-form";
import { listPasskeys } from "@/lib/passkeys";
import { getSiteSettings } from "@/lib/site";

export default async function SettingsPage() {
  const [settings, passkeys] = await Promise.all([getSiteSettings(), listPasskeys()]);
  return (
    <>
      <h1 className="font-serif text-[28px] leading-tight text-stone-700 dark:text-zinc-200">站点设置</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-zinc-500">首页的名字、简介和页脚链接，中英文版分别设置；以及后台登录方式。</p>
      <SettingsForm initial={settings} />
      <PasskeyManager initial={passkeys} />
    </>
  );
}
