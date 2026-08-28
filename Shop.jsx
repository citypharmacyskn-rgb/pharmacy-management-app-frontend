import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Plus, Trash2, MapPin, Phone, Mail, Clock, Facebook, Instagram, ExternalLink, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const emptyShopInfo = {
  shop_name: "", tagline: "", description: "", logo_url: "", banner_url: "",
  address: "", phone: "", email: "", hours: "", social_facebook: "", social_instagram: "",
};

const emptyAd = {
  title: "", description: "", image_url: "", link_url: "",
  is_active: true, start_date: "", end_date: "", display_order: 0,
};

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Shop info (name, hours, contact) is more consequential to get wrong in
  // public than an individual ad, so it's held to a tighter permission
  // (Owner/Manager) than ad management (Owner/Manager/Assistant Manager).
  // See /lib/permissions.js for the full matrix.
  const canEditInfo = can(user, "SHOP_EDIT_INFO");
  const canManageAds = can(user, "SHOP_MANAGE_ADS");

  const [shopInfo, setShopInfo] = useState(null); // existing record, or null if none created yet
  const [infoForm, setInfoForm] = useState(emptyShopInfo);
  const [editingInfo, setEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [adForm, setAdForm] = useState(emptyAd);
  const [savingAd, setSavingAd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [infoList, adList] = await Promise.all([
        api.entities.ShopInfo.list(),
        api.entities.Advertisement.list("-display_order"),
      ]);
      const info = infoList && infoList.length ? infoList[0] : null;
      setShopInfo(info);
      setInfoForm(info ? { ...emptyShopInfo, ...info } : emptyShopInfo);
      setAds(adList || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isAdLive = (ad) => {
    if (!ad.is_active) return false;
    if (ad.start_date && new Date(ad.start_date) > today) return false;
    if (ad.end_date && new Date(ad.end_date) < today) return false;
    return true;
  };
  // Anyone who can manage ads also gets to see paused/scheduled ones so
  // they can prep and review before they go live; everyone else only sees
  // what's actually live right now.
  const visibleAds = canManageAds ? ads : ads.filter(isAdLive);

  const set = (k, v) => setInfoForm((f) => ({ ...f, [k]: v }));
  const setAdField = (k, v) => setAdForm((f) => ({ ...f, [k]: v }));

  const saveInfo = async () => {
    if (!canEditInfo) return;
    if (!infoForm.shop_name.trim()) {
      toast({ title: "Shop name is required", variant: "destructive" });
      return;
    }
    setSavingInfo(true);
    try {
      if (shopInfo) {
        await api.entities.ShopInfo.update(shopInfo.id, infoForm);
      } else {
        await api.entities.ShopInfo.create(infoForm);
      }
      toast({ title: "Shop page updated" });
      setEditingInfo(false);
      load();
    } catch (e) {
      toast({ title: "Error saving shop info", variant: "destructive" });
    } finally {
      setSavingInfo(false);
    }
  };

  const openNewAd = () => { if (!canManageAds) return; setEditingAd(null); setAdForm(emptyAd); setAdDialogOpen(true); };
  const openEditAd = (ad) => { if (!canManageAds) return; setEditingAd(ad); setAdForm({ ...emptyAd, ...ad }); setAdDialogOpen(true); };

  const saveAd = async () => {
    if (!canManageAds) return;
    if (!adForm.title.trim() || !adForm.image_url.trim()) {
      toast({ title: "Title and image URL are required", variant: "destructive" });
      return;
    }
    setSavingAd(true);
    try {
      if (editingAd) {
        await api.entities.Advertisement.update(editingAd.id, adForm);
        toast({ title: "Ad updated" });
      } else {
        await api.entities.Advertisement.create(adForm);
        toast({ title: "Ad created" });
      }
      setAdDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Error saving ad", variant: "destructive" });
    } finally {
      setSavingAd(false);
    }
  };

  const confirmDeleteAd = async () => {
    if (!canManageAds || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.entities.Advertisement.delete(deleteTarget.id);
      toast({ title: "Ad deleted" });
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast({ title: "Error deleting ad", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const toggleAdActive = async (ad) => {
    if (!canManageAds) return;
    try {
      await api.entities.Advertisement.update(ad.id, { is_active: !ad.is_active });
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
    } catch (e) {
      toast({ title: "Error updating ad", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {!canEditInfo && !canManageAds && (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" />
          Viewing only — shop page editing is available to Owners, Managers, and Assistant Managers.
        </div>
      )}

      {/* ---------- Shop info ---------- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {infoForm.banner_url && (
          <div className="h-40 bg-slate-100 overflow-hidden">
            <img src={infoForm.banner_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {infoForm.logo_url && (
                <img src={infoForm.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
              )}
              <div>
                <h1 className="text-2xl font-heading font-bold text-slate-900">
                  {infoForm.shop_name || "Untitled Shop"}
                </h1>
                {infoForm.tagline && <p className="text-slate-500 text-sm mt-0.5">{infoForm.tagline}</p>}
              </div>
            </div>
            {canEditInfo && !editingInfo && (
              <Button variant="outline" size="sm" onClick={() => setEditingInfo(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit shop page
              </Button>
            )}
          </div>

          {!editingInfo ? (
            <>
              {infoForm.description && (
                <p className="text-sm text-slate-600 mt-4 leading-relaxed">{infoForm.description}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                {infoForm.address && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {infoForm.address}</span>
                )}
                {infoForm.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {infoForm.phone}</span>
                )}
                {infoForm.email && (
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {infoForm.email}</span>
                )}
                {infoForm.hours && (
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {infoForm.hours}</span>
                )}
                {infoForm.social_facebook && (
                  <a href={infoForm.social_facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-teal-600">
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </a>
                )}
                {infoForm.social_instagram && (
                  <a href={infoForm.social_instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-teal-600">
                    <Instagram className="w-3.5 h-3.5" /> Instagram
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Shop Name *</Label>
                  <Input value={infoForm.shop_name} onChange={(e) => set("shop_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input value={infoForm.tagline} onChange={(e) => set("tagline", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={infoForm.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Logo Image URL</Label>
                  <Input value={infoForm.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Banner Image URL</Label>
                  <Input value={infoForm.banner_url} onChange={(e) => set("banner_url", e.target.value)} placeholder="https://…" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={infoForm.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={infoForm.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={infoForm.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Store Hours</Label>
                  <Input value={infoForm.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Mon–Sat 9am–7pm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Facebook URL</Label>
                  <Input value={infoForm.social_facebook} onChange={(e) => set("social_facebook", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram URL</Label>
                  <Input value={infoForm.social_instagram} onChange={(e) => set("social_instagram", e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setEditingInfo(false); setInfoForm(shopInfo ? { ...emptyShopInfo, ...shopInfo } : emptyShopInfo); }}>
                  Cancel
                </Button>
                <Button onClick={saveInfo} disabled={savingInfo} className="bg-teal-600 hover:bg-teal-700">
                  {savingInfo ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Ads ---------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-slate-900">
            {canManageAds ? "Ads & Promotions" : "Current Promotions"}
          </h2>
          {canManageAds && (
            <Button size="sm" onClick={openNewAd} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New ad
            </Button>
          )}
        </div>

        {visibleAds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            No {canManageAds ? "" : "active "}ads yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleAds.map((ad) => {
              const live = isAdLive(ad);
              return (
                <div key={ad.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="h-32 bg-slate-100">
                    <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm text-slate-900">{ad.title}</h3>
                      {canManageAds && (
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                          live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                          {live ? "Live" : ad.is_active ? "Scheduled" : "Paused"}
                        </span>
                      )}
                    </div>
                    {ad.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ad.description}</p>}
                    {ad.link_url && (
                      <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-2">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {(ad.start_date || ad.end_date) && (
                      <p className="text-[11px] text-slate-400 mt-2">
                        {ad.start_date ? format(new Date(ad.start_date), "MMM d") : "Anytime"}
                        {" – "}
                        {ad.end_date ? format(new Date(ad.end_date), "MMM d, yyyy") : "No end date"}
                      </p>
                    )}
                    {canManageAds && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Switch checked={ad.is_active} onCheckedChange={() => toggleAdActive(ad)} />
                          <span className="text-xs text-slate-500">Active</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditAd(ad)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-lg">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(ad)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ad editor dialog */}
      {canManageAds && (
        <Dialog open={adDialogOpen} onOpenChange={setAdDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAd ? "Edit Ad" : "New Ad"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={adForm.title} onChange={(e) => setAdField("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={adForm.description} onChange={(e) => setAdField("description", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Image URL *</Label>
                <Input value={adForm.image_url} onChange={(e) => setAdField("image_url", e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>Link URL</Label>
                <Input value={adForm.link_url} onChange={(e) => setAdField("link_url", e.target.value)} placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input type="date" value={adForm.start_date ? adForm.start_date.substring(0, 10) : ""} onChange={(e) => setAdField("start_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input type="date" value={adForm.end_date ? adForm.end_date.substring(0, 10) : ""} onChange={(e) => setAdField("end_date", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" value={adForm.display_order} onChange={(e) => setAdField("display_order", parseInt(e.target.value) || 0)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <Label>Active</Label>
                <Switch checked={adForm.is_active} onCheckedChange={(v) => setAdField("is_active", v)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveAd} disabled={savingAd} className="bg-teal-600 hover:bg-teal-700">
                {savingAd ? "Saving..." : editingAd ? "Update" : "Create ad"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete ad?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently remove <span className="font-semibold">{deleteTarget?.title}</span>. This can't be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={confirmDeleteAd} disabled={deleting} className="bg-rose-600 hover:bg-rose-700">
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
