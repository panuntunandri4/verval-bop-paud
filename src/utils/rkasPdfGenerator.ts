import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AccountProfile,
  KOMPONEN_BOP_10,
  RkasItem,
  STANDAR_PENDIDIKAN_7,
  SignatoryData,
  formatRupiah,
  validateRkasJuknis,
} from '../types/bop';

export function generateRkasVerificationPdf(params: {
  school: AccountProfile;
  items: RkasItem[];
  tahunAnggaran: number;
  signatories: SignatoryData;
}) {
  const { school, items, tahunAnggaran, signatories } = params;
  const schoolItems = items.filter((i) => i.npsn === school.id);
  const validation = validateRkasJuknis(school, items);

  const standarMap = new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s]));
  const komponenMap = new Map(KOMPONEN_BOP_10.map((k) => [k.id, k]));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // --- 1. KOP SURAT LEMBAGA / DINAS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'PEMERINTAH KABUPATEN JEPARA — DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA',
    pageWidth / 2,
    14,
    { align: 'center' }
  );

  doc.setFontSize(13);
  doc.text(school.nama.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NPSN: ${school.id}  |  Status Satuan: ${school.statusSekolah || 'SWASTA'}  |  Wilayah: ${school.wilayah}`,
    pageWidth / 2,
    25,
    { align: 'center' }
  );

  // Double horizontal line under Kop
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(marginX, 28, pageWidth - marginX, 28);
  doc.setLineWidth(0.25);
  doc.line(marginX, 29.2, pageWidth - marginX, 29.2);

  // --- 2. JUDUL DOKUMEN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'LEMBAR VERIFIKASI DAN PENGESAHAN RKAS DANA BOP PAUD',
    pageWidth / 2,
    35.5,
    { align: 'center' }
  );
  doc.setFontSize(9.5);
  doc.text(
    `TAHUN ANGGARAN ${tahunAnggaran} (JUKNIS BOSP — PERMENDIKDASMEN NOMOR 8 TAHUN 2026)`,
    pageWidth / 2,
    40.5,
    { align: 'center' }
  );

  // --- 3. IDENTITAS SATUAN PENDIDIKAN ---
  autoTable(doc, {
    startY: 44,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, fillColor: [248, 250, 252] },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', cellWidth: 38, fillColor: [248, 250, 252] },
      3: { cellWidth: 53 },
    },
    body: [
      [
        'Nama Lembaga',
        school.nama,
        'Pagu BOP Tahunan',
        formatRupiah(validation.paguTahunan),
      ],
      [
        'NPSN / Status',
        `${school.id} / ${school.statusSekolah || 'SWASTA'}`,
        'Total Rencana RKAS',
        `${formatRupiah(validation.totalRencana)} (${validation.persenTerencana.toFixed(1)}%)`,
      ],
      [
        'Wilayah Binaan',
        school.wilayah,
        'Tahap 1 / Tahap 2',
        `${formatRupiah(validation.totalTahap1)} / ${formatRupiah(validation.totalTahap2)}`,
      ],
      [
        'Jumlah Peserta Didik',
        `${school.jumlahSiswa || 0} Siswa (@ ${formatRupiah(school.satuanBiaya || 600000)})`,
        'Status Verifikasi RKAS',
        (school.rkasStatus || 'DRAFT').replace(/_/g, ' '),
      ],
    ],
  });

  let currentY = (doc as any).lastAutoTable.finalY + 5;

  // --- 4. HASIL VERIFIKASI KETENTUAN JUKNIS BOSP ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    'A. Verifikasi Kepatuhan Ketentuan Operasional Juknis BOSP',
    marginX,
    currentY
  );

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    head: [
      [
        'Indikator Ketentuan Juknis BOSP',
        'Alokasi (Rp)',
        'Persentase',
        'Ketentuan',
        'Hasil Uji',
      ],
    ],
    body: validation.checks.map((chk) => [
      chk.judul,
      formatRupiah(chk.nominalAktual),
      `${chk.persenAktual.toFixed(2)}%`,
      chk.tipeBatas === 'MIN'
        ? `Minimal ${chk.batasPersen}%`
        : `Maksimal ${chk.batasPersen}%`,
      chk.lulus ? 'SESUAI' : 'REVISI',
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 1.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // --- 5. REKAPITULASI 7 STANDAR PENDIDIKAN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    'B. Rekapitulasi Anggaran Berdasarkan 7 Standar Pendidikan PAUD',
    marginX,
    currentY
  );

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    head: [['Kode', 'Standar Nasional Pendidikan PAUD', 'Jumlah Anggaran', '% Pagu']],
    body: validation.perStandar.map((s) => [
      s.standar.kode,
      s.standar.nama,
      formatRupiah(s.nominal),
      `${s.persenPagu.toFixed(2)}%`,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.6,
      cellPadding: 1.6,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // --- 6. RINCIAN KEGIATAN RKAS (10 KOMPONEN PENGGUNAAN DANA BOP PAUD) ---
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    'C. Rincian Kegiatan RKAS Berdasarkan 10 Komponen Penggunaan Dana BOP PAUD',
    marginX,
    currentY
  );

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: marginX, right: marginX },
    head: [
      [
        'No',
        'Komponen & Standar',
        'Uraian Kegiatan & Spesifikasi',
        'Vol',
        'Harga Satuan',
        'Tahap 1',
        'Tahap 2',
        'Jumlah Total',
        'Verval',
      ],
    ],
    body: [
      ...schoolItems.map((item, idx) => {
        const komp = komponenMap.get(item.komponenId);
        const std = standarMap.get(item.standarId);
        return [
          String(idx + 1),
          `K-${komp?.nomor || '-'}: ${komp?.nama || item.komponenId}\n(${std ? `${std.kode} ${std.nama}` : item.standarId})`,
          `${item.uraianKegiatan}\nSpesifikasi: ${item.spesifikasi}${
            item.kodeShs ? `\nRef. SHS Jepara: ${item.kodeShs}` : ''
          }${
            item.catatanVerifikator ? `\nCatatan: ${item.catatanVerifikator}` : ''
          }`,
          `${item.volume} ${item.satuan}`,
          formatRupiah(item.hargaSatuan),
          formatRupiah(item.tahap1),
          formatRupiah(item.tahap2),
          formatRupiah(item.jumlahTotal),
          item.statusItem,
        ];
      }),
      [
        '',
        { content: 'JUMLAH TOTAL RKAS BOP PAUD', colSpan: 4, styles: { fontStyle: 'bold' } },
        {
          content: formatRupiah(validation.totalTahap1),
          styles: { fontStyle: 'bold', halign: 'right' },
        },
        {
          content: formatRupiah(validation.totalTahap2),
          styles: { fontStyle: 'bold', halign: 'right' },
        },
        {
          content: formatRupiah(validation.totalRencana),
          styles: { fontStyle: 'bold', halign: 'right' },
        },
        '',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontSize: 7.4,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.7,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 33 },
      2: { cellWidth: 44 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Catatan Resmi Dinas (jika ada)
  if (school.catatanDinas) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 16;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    const splitNote = doc.splitTextToSize(
      `Catatan Verifikasi Dinas: ${school.catatanDinas}`,
      contentWidth - 6
    );
    const boxH = splitNote.length * 4 + 4;
    doc.rect(marginX, currentY, contentWidth, boxH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitNote, marginX + 3, currentY + 4.5);
    currentY += boxH + 6;
  }

  // --- 7. BLOK TANDA TANGAN RESMI (KOMITE KIRI, KEPSEK TENGAH, BENDAHARA KANAN + MENGETAHUI KADIS DIKPORA) ---
  const requiredSignatureHeight = 78;
  if (currentY + requiredSignatureHeight > pageHeight - 12) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 3;
  }

  const colWidth = contentWidth / 3;
  const leftCenterX = marginX + colWidth * 0.5;
  const midCenterX = marginX + colWidth * 1.5;
  const rightCenterX = marginX + colWidth * 2.5;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  // Baris 1: Keterangan atas masing-masing pejabat lembaga
  doc.text('Menyetujui,', leftCenterX, currentY, { align: 'center' });
  doc.text('Mengesahkan,', midCenterX, currentY, { align: 'center' });
  doc.text(signatories.tempatTanggal, rightCenterX, currentY, {
    align: 'center',
  });

  // Baris 2: Jabatan (Komite Sekolah kiri, Kepala Sekolah tengah, Bendahara kanan)
  doc.setFont('helvetica', 'bold');
  doc.text('Komite Sekolah', leftCenterX, currentY + 4.5, { align: 'center' });
  doc.text('Kepala Sekolah', midCenterX, currentY + 4.5, { align: 'center' });
  doc.text('Bendahara', rightCenterX, currentY + 4.5, { align: 'center' });

  // Ruang tanda tangan (21mm)
  const nameY = currentY + 25.5;

  // Nama Pejabat Lembaga (bergaris bawah)
  doc.setFont('helvetica', 'bold');
  doc.text(signatories.komiteSekolah || '( .................................... )', leftCenterX, nameY, {
    align: 'center',
  });
  doc.text(signatories.kepalaSekolah || '( .................................... )', midCenterX, nameY, {
    align: 'center',
  });
  doc.text(signatories.bendahara || '( .................................... )', rightCenterX, nameY, {
    align: 'center',
  });

  // Garis bawah nama
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.25);
  doc.line(leftCenterX - 24, nameY + 1, leftCenterX + 24, nameY + 1);
  doc.line(midCenterX - 24, nameY + 1, midCenterX + 24, nameY + 1);
  doc.line(rightCenterX - 24, nameY + 1, rightCenterX + 24, nameY + 1);

  // NIP / NIY Kepala Sekolah & Bendahara
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `NIP/NIY. ${signatories.nipKepalaSekolah || '-'}`,
    midCenterX,
    nameY + 5,
    { align: 'center' }
  );
  doc.text(
    `NIP/NIY. ${signatories.nipBendahara || '-'}`,
    rightCenterX,
    nameY + 5,
    { align: 'center' }
  );

  // Baris Bawah Tengah: Mengetahui Kepala Dinas Pendidikan Pemuda dan Olahraga
  const kadisTopY = nameY + 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', pageWidth / 2, kadisTopY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(
    'Kepala Dinas Pendidikan Pemuda dan Olahraga',
    pageWidth / 2,
    kadisTopY + 4.5,
    { align: 'center' }
  );

  const kadisNameY = kadisTopY + 25.5;
  doc.text(
    signatories.kepalaDinas || '( ............................................ )',
    pageWidth / 2,
    kadisNameY,
    { align: 'center' }
  );
  doc.line(pageWidth / 2 - 30, kadisNameY + 1, pageWidth / 2 + 30, kadisNameY + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (signatories.pangkatKepalaDinas) {
    doc.text(signatories.pangkatKepalaDinas, pageWidth / 2, kadisNameY + 4.8, {
      align: 'center',
    });
    doc.text(
      `NIP. ${signatories.nipKepalaDinas || '-'}`,
      pageWidth / 2,
      kadisNameY + 8.8,
      { align: 'center' }
    );
  } else {
    doc.text(
      `NIP. ${signatories.nipKepalaDinas || '-'}`,
      pageWidth / 2,
      kadisNameY + 5,
      { align: 'center' }
    );
  }

  // Page numbering footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Resmi SIM VERVAL RKAS & BOP PAUD TA ${tahunAnggaran} — NPSN ${school.id}  |  Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  doc.save(`Verifikasi_RKAS_BOP_PAUD_${school.id}_${tahunAnggaran}.pdf`);
}
