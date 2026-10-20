import heroPoojaImg from '../assets/images/hero_sri_balaji_pooja_1792512307926.jpg';
import champaImg from '../assets/images/product_champa_agarbatti_1792512308476.jpg';
import sambraniImg from '../assets/images/product_cup_sambrani_1792512309419.jpg';
import dhoopConesImg from '../assets/images/product_dhoop_cones_1792512310918.jpg';
import camphorImg from '../assets/images/product_bhimseni_camphor_1792512310482.jpg';

export const ASSET_IMAGES = {
  hero: heroPoojaImg,
  champaAgarbatti: champaImg,
  cupSambrani: sambraniImg,
  dhoopCones: dhoopConesImg,
  bhimseniCamphor: camphorImg
};

export function getProductImage(slug: string): string {
  if (slug.includes('flora') || slug.includes('agarbatti') || slug.includes('sandal')) {
    return champaImg;
  }
  if (slug.includes('sambrani') || slug.includes('loban')) {
    return sambraniImg;
  }
  if (slug.includes('cone') || slug.includes('rose') || slug.includes('kasturi')) {
    return dhoopConesImg;
  }
  if (slug.includes('camphor') || slug.includes('karpur') || slug.includes('burner') || slug.includes('thali')) {
    return camphorImg;
  }
  return champaImg;
}
